// Bombay Bicycle Chef — kitchen print agent.
//
// A Windows service that watches for new orders and prints them. It replaces
// the Sunmi terminal, which was locked by its reseller, and the browser page,
// which only prints while somebody is logged in with a tab open.
//
// Why a service and not an app: it starts before anyone logs in, it comes back
// by itself after a power cut, and nobody can close it by tidying up windows.
//
// Why C# compiled on the machine: every Windows since Vista ships csc.exe, so
// there is no runtime to install on a 2011 till with 4GB of RAM, and no build
// toolchain to keep working. One source file in, one .exe out.
//
// It talks to the same POS API the Android terminal used — login, poll, mark
// printed, mark failed — so there is one definition of "this order has been
// printed" shared by every device, and an order cannot print twice.

using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.ServiceProcess;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

namespace BombayBicycleChef
{
    internal static class Program
    {
        public const string ServiceName = "BBCPrintAgent";

        private static int Main(string[] args)
        {
            // Vercel will not negotiate TLS 1.0, which is what .NET Framework
            // picks by default on an older Windows. Without this every request
            // fails with a bare "connection closed" and nothing explains why.
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; // TLS 1.2
            ServicePointManager.DefaultConnectionLimit = 8;

            string verb = args.Length > 0 ? args[0].ToLowerInvariant() : "";

            switch (verb)
            {
                case "--set-credentials":
                    if (args.Length < 3)
                    {
                        Console.Error.WriteLine("Usage: --set-credentials <email> <password>");
                        return 2;
                    }
                    Credentials.Save(args[1], args[2]);
                    Console.WriteLine("Saved. They are encrypted to this machine and cannot be read on another.");
                    return 0;

                case "--test-print":
                    try
                    {
                        Printer.Send(Ticket.Test(), Config.Load().Printer);
                        Console.WriteLine("Sent a test ticket. Go and look at the printer.");
                        return 0;
                    }
                    catch (Exception e)
                    {
                        Console.Error.WriteLine("Could not print: " + e.Message);
                        return 1;
                    }

                case "--printers":
                    Console.WriteLine("Default printer: " + Printer.DefaultName());
                    return 0;

                case "--preview":
                    // Shows the ticket for a made-up order as text, so the
                    // layout can be checked over a remote session without
                    // standing next to the printer feeding it paper.
                    Console.WriteLine(Ticket.Preview(Ticket.Build(Order.Sample(), Config.Load())));
                    return 0;

                case "--console":
                    // Same loop the service runs, but attached to a window, so a
                    // problem shows itself instead of hiding in the event log.
                    Log.ToConsole = true;
                    var agent = new Agent();
                    Console.CancelKeyPress += delegate { agent.Stop(); };
                    agent.Run();
                    return 0;

                default:
                    ServiceBase.Run(new PrintService());
                    return 0;
            }
        }
    }

    public class PrintService : ServiceBase
    {
        private readonly Agent _agent = new Agent();
        private Thread _worker;

        public PrintService()
        {
            ServiceName = Program.ServiceName;
            CanShutdown = true;
        }

        protected override void OnStart(string[] args)
        {
            _worker = new Thread(_agent.Run);
            _worker.IsBackground = true;
            _worker.Start();
        }

        protected override void OnStop()
        {
            _agent.Stop();
            if (_worker != null) _worker.Join(TimeSpan.FromSeconds(10));
        }

        protected override void OnShutdown()
        {
            OnStop();
        }
    }

    /* ---- the loop ------------------------------------------------------ */

    internal sealed class Agent
    {
        private volatile bool _stopping;
        private readonly ManualResetEvent _wake = new ManualResetEvent(false);
        private Session _session;

        public void Stop()
        {
            _stopping = true;
            _wake.Set();
        }

        public void Run()
        {
            Config config;
            try
            {
                config = Config.Load();
            }
            catch (Exception e)
            {
                Log.Write("Cannot read the configuration, so there is nothing to do: " + e.Message);
                return;
            }

            Log.Write("Started. Watching " + config.Location + " at " + config.BaseUrl +
                      ", printing to " + (config.Printer.Length > 0 ? config.Printer : "the default printer") + ".");

            var already = PrintedLog.Load();

            while (!_stopping)
            {
                try
                {
                    Tick(config, already);
                }
                catch (Exception e)
                {
                    // Never let one bad poll end the service: a kitchen with a
                    // stopped print agent finds out the slow way.
                    Log.Write("Poll failed: " + e.Message);
                }

                _wake.WaitOne(TimeSpan.FromSeconds(config.PollSeconds));
            }

            Log.Write("Stopped.");
        }

        private void Tick(Config config, PrintedLog already)
        {
            if (_session == null || _session.NeedsRefresh)
            {
                _session = Api.SignIn(config, _session);
                if (_session == null)
                {
                    Log.Write("Not signed in. Check the saved email and password.");
                    return;
                }
            }

            List<Order> orders;
            try
            {
                orders = Api.Poll(config, _session);
            }
            catch (UnauthorizedException)
            {
                Log.Write("The session was rejected; signing in again.");
                _session = null;
                return;
            }

            // Oldest first: the kitchen should see tickets in the order the
            // customers placed them, not newest-first as the screen shows them.
            orders.Reverse();

            foreach (Order order in orders)
            {
                if (_stopping) return;
                if (order.IsPrinted) continue;

                if (already.Contains(order.Id))
                {
                    // Printed here, but the server was not told. Tell it again
                    // rather than printing a second ticket.
                    if (Api.MarkPrinted(config, _session, order.Id)) already.Forget(order.Id);
                    continue;
                }

                PrintOne(config, order, already);
            }
        }

        private void PrintOne(Config config, Order order, PrintedLog already)
        {
            int copies = Math.Max(1, config.Copies);
            try
            {
                for (int i = 0; i < copies; i++)
                {
                    if (i > 0) Thread.Sleep(TimeSpan.FromSeconds(Math.Max(0, config.GapSeconds)));
                    Printer.Send(Ticket.Build(order, config), config.Printer);
                }
            }
            catch (Exception e)
            {
                Log.Write("Order " + order.Code + " did not print: " + e.Message);
                Api.MarkPrintFailed(config, _session, order.Id, e.Message);
                return;
            }

            // Paper is out. Record that locally FIRST, so a failure to reach the
            // server costs an entry in a file rather than a second ticket.
            already.Remember(order.Id);
            if (Api.MarkPrinted(config, _session, order.Id)) already.Forget(order.Id);

            Log.Write("Printed " + order.Code + " (" + order.Fulfilment + ", " +
                      order.Total.ToString("0.00", CultureInfo.InvariantCulture) + (order.IsCash ? ", CASH" : "") + ").");
        }
    }

    /* ---- the API ------------------------------------------------------- */

    internal sealed class UnauthorizedException : Exception { }

    internal sealed class Session
    {
        public string Token;
        public string RefreshToken;
        public DateTime ExpiresAt;

        // Refreshed a minute early, because a token that expires mid-request
        // costs an order the time it takes to notice.
        public bool NeedsRefresh { get { return DateTime.UtcNow >= ExpiresAt.AddMinutes(-1); } }
    }

    internal static class Api
    {
        public static Session SignIn(Config config, Session previous)
        {
            if (previous != null && !string.IsNullOrEmpty(previous.RefreshToken))
            {
                Session refreshed = TryRefresh(config, previous.RefreshToken);
                if (refreshed != null) return refreshed;
                Log.Write("The refresh token was not accepted; signing in with the saved password instead.");
            }

            string email, password;
            if (!Credentials.Load(out email, out password)) return null;

            var body = new Dictionary<string, object> { { "email", email }, { "password", password } };
            try
            {
                var json = Http.Send(config.BaseUrl + "/api/pos/auth/login", "POST", null, body);
                return FromTokens(json);
            }
            catch (Exception e)
            {
                Log.Write("Sign-in failed: " + e.Message);
                return null;
            }
        }

        private static Session TryRefresh(Config config, string refreshToken)
        {
            try
            {
                var body = new Dictionary<string, object> { { "refreshToken", refreshToken } };
                var json = Http.Send(config.BaseUrl + "/api/pos/auth/refresh", "POST", null, body);
                return FromTokens(json);
            }
            catch
            {
                return null;
            }
        }

        private static Session FromTokens(Dictionary<string, object> json)
        {
            if (json == null || !json.ContainsKey("token")) return null;
            long expires = Json.Long(json, "expiresAt");
            return new Session
            {
                Token = Json.Str(json, "token"),
                RefreshToken = Json.Str(json, "refreshToken"),
                // The server sends a Unix second; an absent or odd value just
                // means "refresh soon", which is harmless.
                ExpiresAt = expires > 0
                    ? new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddSeconds(expires)
                    : DateTime.UtcNow.AddMinutes(30),
            };
        }

        public static List<Order> Poll(Config config, Session session)
        {
            var json = Http.Send(config.BaseUrl + "/api/pos/orders/poll/" + Uri.EscapeDataString(config.Location),
                                 "GET", session.Token, null);
            var list = new List<Order>();
            var rows = Json.Array(json, "orders");
            foreach (var row in rows) list.Add(Order.From(row));
            return list;
        }

        public static bool MarkPrinted(Config config, Session session, string orderId)
        {
            try
            {
                Http.Send(config.BaseUrl + "/api/pos/orders/" + Uri.EscapeDataString(orderId) + "/printed",
                          "PATCH", session.Token, null);
                return true;
            }
            catch (Exception e)
            {
                Log.Write("Printed, but could not tell the server: " + e.Message);
                return false;
            }
        }

        public static void MarkPrintFailed(Config config, Session session, string orderId, string reason)
        {
            try
            {
                var body = new Dictionary<string, object> { { "error", reason } };
                Http.Send(config.BaseUrl + "/api/pos/orders/" + Uri.EscapeDataString(orderId) + "/print-failed",
                          "PATCH", session.Token, body);
            }
            catch
            {
                // Already handling a failure; a second one changes nothing.
            }
        }
    }

    internal static class Http
    {
        public static Dictionary<string, object> Send(string url, string method, string bearer, object body)
        {
            var request = (HttpWebRequest)WebRequest.Create(url);
            request.Method = method;
            request.Timeout = 20000;
            request.ReadWriteTimeout = 20000;
            request.UserAgent = "BBCPrintAgent/1.0";
            request.Accept = "application/json";
            if (!string.IsNullOrEmpty(bearer)) request.Headers["Authorization"] = "Bearer " + bearer;

            if (body != null)
            {
                byte[] payload = Encoding.UTF8.GetBytes(new JavaScriptSerializer().Serialize(body));
                request.ContentType = "application/json";
                request.ContentLength = payload.Length;
                using (Stream s = request.GetRequestStream()) s.Write(payload, 0, payload.Length);
            }
            else if (method != "GET")
            {
                request.ContentLength = 0;
            }

            try
            {
                using (var response = (HttpWebResponse)request.GetResponse())
                using (var reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8))
                {
                    string text = reader.ReadToEnd();
                    if (text.Length == 0) return new Dictionary<string, object>();
                    var parser = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
                    return parser.Deserialize<Dictionary<string, object>>(text) ?? new Dictionary<string, object>();
                }
            }
            catch (WebException e)
            {
                var response = e.Response as HttpWebResponse;
                if (response != null && response.StatusCode == HttpStatusCode.Unauthorized) throw new UnauthorizedException();
                string detail = "";
                if (response != null)
                {
                    using (var reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8))
                        detail = " " + reader.ReadToEnd();
                    throw new Exception("HTTP " + (int)response.StatusCode + detail.Trim());
                }
                throw new Exception(e.Message);
            }
        }
    }

    /* ---- orders -------------------------------------------------------- */

    internal sealed class OrderLine
    {
        public int Qty;
        public string Name = "";
        public string Notes = "";
        public List<string> Modifiers = new List<string>();
    }

    internal sealed class Order
    {
        public string Id = "";
        public string Code = "";
        public string CustomerName = "";
        public string CustomerPhone = "";
        public string Fulfilment = "collection";
        public bool IsPrinted;
        public bool IsCash;
        public double Total, Subtotal, DeliveryFee, Discount;
        public string PromoCode = "";
        public string Notes = "";
        public string Address = "";
        public DateTime PlacedAt = DateTime.Now;
        public List<OrderLine> Items = new List<OrderLine>();

        public bool IsDelivery { get { return Fulfilment == "delivery"; } }

        /// <summary>A plausible order, for --preview. Not used in service.</summary>
        public static Order Sample()
        {
            var o = new Order
            {
                Id = "sample",
                Code = "F6FC4E4D",
                CustomerName = "A. Patel",
                CustomerPhone = "07700 900123",
                Fulfilment = "delivery",
                IsCash = true,
                Subtotal = 28.40,
                DeliveryFee = 1.99,
                Discount = 2.84,
                PromoCode = "WELCOME10",
                Total = 27.55,
                Notes = "ring the top bell, buzzer is broken",
                Address = "14 Balham High Road, London, SW12 9AJ",
            };
            o.Items.Add(new OrderLine { Qty = 2, Name = "Chicken Tikka Masala", Modifiers = { "Extra hot", "No coriander" } });
            o.Items.Add(new OrderLine { Qty = 1, Name = "Lamb Biryani", Notes = "no onions please" });
            o.Items.Add(new OrderLine { Qty = 3, Name = "Garlic & Coriander Naan" });
            return o;
        }

        public static Order From(Dictionary<string, object> row)
        {
            var o = new Order
            {
                Id = Json.Str(row, "_id"),
                Code = Json.Str(row, "orderNumber"),
                CustomerName = Json.Str(row, "customerName"),
                CustomerPhone = Json.Str(row, "customerPhone"),
                Fulfilment = Json.Str(row, "orderType"),
                IsPrinted = Json.Bool(row, "isPrinted"),
                IsCash = Json.Str(row, "paymentStatus") == "cash",
                Total = Json.Number(row, "totalPrice"),
                Subtotal = Json.Number(row, "subtotal"),
                DeliveryFee = Json.Number(row, "deliveryFee"),
                Discount = Json.Number(row, "discount"),
                PromoCode = Json.Str(row, "promoCode"),
                Notes = Json.Str(row, "specialInstructions"),
            };

            DateTime placed;
            if (DateTime.TryParse(Json.Str(row, "createdAt"), CultureInfo.InvariantCulture,
                                  DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out placed))
                o.PlacedAt = placed.ToLocalTime();

            var address = Json.Object(row, "deliveryAddress");
            if (address != null)
            {
                var parts = new List<string>();
                foreach (string key in new[] { "street", "city", "postalCode" })
                {
                    string value = Json.Str(address, key);
                    if (value.Length > 0) parts.Add(value);
                }
                o.Address = string.Join(", ", parts.ToArray());
            }

            foreach (var item in Json.Array(row, "orderItems"))
            {
                var line = new OrderLine
                {
                    Qty = (int)Json.Number(item, "quantity"),
                    Name = Json.Str(item, "productName"),
                    Notes = Json.Str(item, "specialInstructions"),
                };
                if (line.Qty < 1) line.Qty = 1;
                foreach (var topping in Json.Array(item, "selectedToppings"))
                {
                    string name = Json.Str(topping, "name");
                    if (name.Length > 0) line.Modifiers.Add(name);
                }
                o.Items.Add(line);
            }

            return o;
        }
    }

    internal static class Json
    {
        public static string Str(Dictionary<string, object> d, string key)
        {
            object v;
            if (d == null || !d.TryGetValue(key, out v) || v == null) return "";
            return Convert.ToString(v, CultureInfo.InvariantCulture);
        }

        public static double Number(Dictionary<string, object> d, string key)
        {
            object v;
            if (d == null || !d.TryGetValue(key, out v) || v == null) return 0;
            try { return Convert.ToDouble(v, CultureInfo.InvariantCulture); }
            catch { return 0; }
        }

        public static long Long(Dictionary<string, object> d, string key)
        {
            return (long)Number(d, key);
        }

        public static bool Bool(Dictionary<string, object> d, string key)
        {
            object v;
            if (d == null || !d.TryGetValue(key, out v) || v == null) return false;
            return v is bool ? (bool)v : Convert.ToString(v).ToLowerInvariant() == "true";
        }

        public static Dictionary<string, object> Object(Dictionary<string, object> d, string key)
        {
            object v;
            if (d == null || !d.TryGetValue(key, out v)) return null;
            return v as Dictionary<string, object>;
        }

        public static List<Dictionary<string, object>> Array(Dictionary<string, object> d, string key)
        {
            var result = new List<Dictionary<string, object>>();
            object v;
            if (d == null || !d.TryGetValue(key, out v)) return result;
            var list = v as System.Collections.IEnumerable;
            if (list == null) return result;
            foreach (object item in list)
            {
                var row = item as Dictionary<string, object>;
                if (row != null) result.Add(row);
            }
            return result;
        }
    }

    /* ---- the ticket ---------------------------------------------------- */

    /// <summary>
    /// Builds the ESC/POS bytes for one ticket.
    ///
    /// Laid out for a cook glancing at paper in a hot kitchen, not for a
    /// customer: what to make and how many, big, at the top. The money is at the
    /// bottom because only the person handing the bag over needs it.
    /// </summary>
    internal static class Ticket
    {
        // ESC/POS, as the TM-T20III and every other receipt printer speaks it.
        private static readonly byte[] Reset = { 0x1B, 0x40 };
        private static readonly byte[] CodePage437 = { 0x1B, 0x74, 0x00 };
        private static readonly byte[] AlignLeft = { 0x1B, 0x61, 0x00 };
        private static readonly byte[] AlignCentre = { 0x1B, 0x61, 0x01 };
        private static readonly byte[] BoldOn = { 0x1B, 0x45, 0x01 };
        private static readonly byte[] BoldOff = { 0x1B, 0x45, 0x00 };
        private static readonly byte[] Cut = { 0x1D, 0x56, 0x42, 0x00 };
        private static readonly byte[] KickDrawer = { 0x1B, 0x70, 0x00, 0x19, 0xFA };

        private const int Width = 42; // 80mm roll, font A

        private static byte[] Size(int width, int height)
        {
            // GS ! n — the low nibble is height, the high nibble width, 0 = 1x.
            return new byte[] { 0x1D, 0x21, (byte)(((width - 1) << 4) | (height - 1)) };
        }

        public static byte[] Build(Order order, Config config)
        {
            var w = new Writer();
            w.Raw(Reset).Raw(CodePage437);

            w.Raw(AlignCentre).Raw(BoldOn).Raw(Size(1, 2));
            w.Line("BOMBAY BICYCLE CHEF");
            w.Raw(Size(1, 1)).Raw(BoldOff);
            w.Line(order.PlacedAt.ToString("ddd dd MMM  HH:mm", CultureInfo.InvariantCulture));
            w.Feed();

            w.Raw(BoldOn).Raw(Size(2, 2));
            w.Line(order.IsDelivery ? "DELIVERY" : "COLLECTION");
            w.Line("#" + order.Code);
            w.Raw(Size(1, 1));

            // Whether money still has to change hands is the one thing nobody
            // can afford to misread, so it gets its own band.
            w.Line(new string('=', Width));
            w.Line(order.IsCash ? "COLLECT CASH  " + Money(order.Total) : "PAID ONLINE");
            w.Line(new string('=', Width));
            w.Raw(BoldOff).Raw(AlignLeft);
            w.Feed();

            foreach (OrderLine line in order.Items)
            {
                w.Raw(BoldOn).Raw(Size(1, 2));
                w.Wrapped(line.Qty + " x " + line.Name, 0, Width);
                w.Raw(Size(1, 1)).Raw(BoldOff);
                foreach (string modifier in line.Modifiers) w.Wrapped("+ " + modifier, 4, Width);
                if (line.Notes.Length > 0)
                {
                    w.Raw(BoldOn);
                    w.Wrapped("** " + line.Notes.ToUpperInvariant(), 4, Width);
                    w.Raw(BoldOff);
                }
                w.Feed();
            }

            if (order.Notes.Length > 0)
            {
                w.Line(new string('-', Width));
                w.Raw(BoldOn);
                w.Wrapped("NOTE: " + order.Notes.ToUpperInvariant(), 0, Width);
                w.Raw(BoldOff);
            }

            w.Line(new string('-', Width));
            w.Columns("Subtotal", Money(order.Subtotal));
            if (order.DeliveryFee > 0) w.Columns("Delivery", Money(order.DeliveryFee));
            if (order.Discount > 0) w.Columns("Discount " + order.PromoCode, "-" + Money(order.Discount));
            w.Raw(BoldOn).Raw(Size(1, 2));
            w.Columns("TOTAL", Money(order.Total));
            w.Raw(Size(1, 1)).Raw(BoldOff);
            w.Line(new string('-', Width));

            w.Raw(BoldOn);
            if (order.CustomerName.Length > 0) w.Line(order.CustomerName);
            if (order.CustomerPhone.Length > 0) w.Raw(Size(1, 2)).Line(order.CustomerPhone).Raw(Size(1, 1));
            if (order.IsDelivery && order.Address.Length > 0) w.Wrapped(order.Address, 0, Width);
            w.Raw(BoldOff);

            w.Feed(4).Raw(Cut);
            if (order.IsCash && config.OpenDrawerOnCash) w.Raw(KickDrawer);
            return w.ToArray();
        }

        public static byte[] Test()
        {
            var w = new Writer();
            w.Raw(Reset).Raw(CodePage437).Raw(AlignCentre).Raw(BoldOn).Raw(Size(1, 2));
            w.Line("BOMBAY BICYCLE CHEF");
            w.Raw(Size(1, 1)).Raw(BoldOff);
            w.Line("Printer test");
            w.Line(DateTime.Now.ToString("ddd dd MMM  HH:mm:ss", CultureInfo.InvariantCulture));
            w.Feed();
            w.Raw(AlignLeft);
            w.Line("If you can read this, the printer, the");
            w.Line("cable and the driver are all fine, and");
            w.Line(Money(12.34) + " prints the right way round.");
            w.Feed(4).Raw(Cut);
            return w.ToArray();
        }

        private static string Money(double pounds)
        {
            return "£" + pounds.ToString("0.00", CultureInfo.InvariantCulture);
        }

        /// <summary>
        /// The ticket as text, with the printer commands taken back out.
        ///
        /// Only the commands this file emits are understood — it is a reading
        /// aid, not an ESC/POS interpreter, and it exists so nobody has to burn
        /// a metre of paper to find out that a dish name wraps badly.
        /// </summary>
        public static string Preview(byte[] data)
        {
            var text = new StringBuilder();
            Encoding cp437 = Encoding.GetEncoding(437);

            for (int i = 0; i < data.Length; i++)
            {
                byte b = data[i];
                if (b == 0x1B) // ESC
                {
                    if (i + 1 >= data.Length) break;
                    byte command = data[i + 1];
                    // @ takes nothing; p takes three; the rest take one.
                    int args = command == 0x40 ? 0 : command == 0x70 ? 3 : 1;
                    i += 1 + args;
                }
                else if (b == 0x1D) // GS
                {
                    if (i + 1 >= data.Length) break;
                    byte command = data[i + 1];
                    int args = command == 0x56 ? 2 : 1; // V (cut) takes two
                    i += 1 + args;
                }
                else if (b == 0x0A)
                {
                    text.Append(Environment.NewLine);
                }
                else
                {
                    text.Append(cp437.GetString(new[] { b }));
                }
            }

            return text.ToString();
        }

        /// <summary>Collects bytes, encoding text as the printer expects it.</summary>
        private sealed class Writer
        {
            // Code page 437 is what the printer is set to above, and it is where
            // a pound sign actually exists. In UTF-8 it prints as two bits of
            // rubbish, which is exactly the sort of thing nobody checks.
            private static readonly Encoding Cp437 = Encoding.GetEncoding(437);
            private readonly MemoryStream _out = new MemoryStream();

            public Writer Raw(byte[] bytes)
            {
                _out.Write(bytes, 0, bytes.Length);
                return this;
            }

            public Writer Text(string text)
            {
                byte[] bytes = Cp437.GetBytes(text);
                _out.Write(bytes, 0, bytes.Length);
                return this;
            }

            public Writer Line(string text)
            {
                return Text(text).Raw(new byte[] { 0x0A });
            }

            public Writer Feed()
            {
                return Raw(new byte[] { 0x0A });
            }

            public Writer Feed(int lines)
            {
                for (int i = 0; i < lines; i++) Feed();
                return this;
            }

            /// <summary>A label on the left, a figure hard against the right.</summary>
            public Writer Columns(string left, string right)
            {
                int gap = Width - left.Length - right.Length;
                if (gap < 1) gap = 1;
                return Line(left + new string(' ', gap) + right);
            }

            /// <summary>
            /// Wraps on spaces rather than letting the printer cut a word in
            /// half — a dish name broken across a line is read wrong at a glance.
            /// </summary>
            public Writer Wrapped(string text, int indent, int width)
            {
                string pad = new string(' ', indent);
                int room = width - indent;
                if (room < 8) room = 8;

                string[] words = text.Split(' ');
                string line = "";
                foreach (string word in words)
                {
                    if (line.Length == 0) line = word;
                    else if (line.Length + 1 + word.Length <= room) line += " " + word;
                    else { Line(pad + line); line = word; }

                    while (line.Length > room)
                    {
                        Line(pad + line.Substring(0, room));
                        line = line.Substring(room);
                    }
                }
                if (line.Length > 0) Line(pad + line);
                return this;
            }

            public byte[] ToArray() { return _out.ToArray(); }
        }
    }

    /* ---- the printer --------------------------------------------------- */

    /// <summary>
    /// Sends bytes to a printer untouched.
    ///
    /// A RAW spooler job, not a drawn page: the printer driver must not get the
    /// chance to render, scale or "improve" a receipt. Going through the spooler
    /// rather than straight at the USB port means Windows still handles sharing,
    /// queueing and retries, and the printer can be swapped without touching this.
    /// </summary>
    internal static class Printer
    {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private class DocInfo
        {
            [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
            [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
            [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
        }

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool OpenPrinter(string printerName, out IntPtr handle, IntPtr defaults);

        [DllImport("winspool.drv", SetLastError = true)]
        private static extern bool ClosePrinter(IntPtr handle);

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool StartDocPrinter(IntPtr handle, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DocInfo info);

        [DllImport("winspool.drv", SetLastError = true)]
        private static extern bool EndDocPrinter(IntPtr handle);

        [DllImport("winspool.drv", SetLastError = true)]
        private static extern bool StartPagePrinter(IntPtr handle);

        [DllImport("winspool.drv", SetLastError = true)]
        private static extern bool EndPagePrinter(IntPtr handle);

        [DllImport("winspool.drv", SetLastError = true)]
        private static extern bool WritePrinter(IntPtr handle, IntPtr bytes, int count, out int written);

        [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool GetDefaultPrinter(StringBuilder name, ref int size);

        public static string DefaultName()
        {
            int size = 0;
            GetDefaultPrinter(null, ref size);
            if (size <= 0) return "";
            var buffer = new StringBuilder(size);
            return GetDefaultPrinter(buffer, ref size) ? buffer.ToString() : "";
        }

        public static void Send(byte[] data, string printerName)
        {
            string target = string.IsNullOrEmpty(printerName) ? DefaultName() : printerName;
            if (string.IsNullOrEmpty(target))
                throw new Exception("No printer is set as the Windows default, and none was named in the configuration.");

            IntPtr printer;
            if (!OpenPrinter(target, out printer, IntPtr.Zero))
                throw new Exception("Cannot open printer \"" + target + "\" (" + Marshal.GetLastWin32Error() + "). Is it installed and switched on?");

            IntPtr buffer = IntPtr.Zero;
            try
            {
                var info = new DocInfo { pDocName = "Kitchen ticket", pDataType = "RAW" };
                if (!StartDocPrinter(printer, 1, info))
                    throw new Exception("The printer refused the job (" + Marshal.GetLastWin32Error() + ").");
                try
                {
                    if (!StartPagePrinter(printer))
                        throw new Exception("The printer refused the page (" + Marshal.GetLastWin32Error() + ").");
                    try
                    {
                        buffer = Marshal.AllocCoTaskMem(data.Length);
                        Marshal.Copy(data, 0, buffer, data.Length);
                        int written;
                        if (!WritePrinter(printer, buffer, data.Length, out written) || written != data.Length)
                            throw new Exception("Only part of the ticket reached the printer. Check paper and cable.");
                    }
                    finally { EndPagePrinter(printer); }
                }
                finally { EndDocPrinter(printer); }
            }
            finally
            {
                if (buffer != IntPtr.Zero) Marshal.FreeCoTaskMem(buffer);
                ClosePrinter(printer);
            }
        }
    }

    /* ---- settings, credentials, state, log ----------------------------- */

    internal sealed class Config
    {
        public string BaseUrl = "https://www.bombay-bicycle-chef.com";
        public string Location = "balham";
        public string Printer = "";
        public int Copies = 1;
        public int GapSeconds = 3;
        public int PollSeconds = 5;
        public bool OpenDrawerOnCash = false;

        public static string Folder
        {
            get
            {
                // ProgramData, not the installing user's profile: a service runs
                // as LocalSystem and can never see somebody's AppData.
                return Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                    "BombayBicycleChef", "PrintAgent");
            }
        }

        public static string Path_ { get { return Path.Combine(Folder, "config.json"); } }

        public static Config Load()
        {
            var config = new Config();
            if (!File.Exists(Path_)) return config;

            var json = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(File.ReadAllText(Path_));
            if (json == null) return config;

            if (Json.Str(json, "baseUrl").Length > 0) config.BaseUrl = Json.Str(json, "baseUrl").TrimEnd('/');
            if (Json.Str(json, "location").Length > 0) config.Location = Json.Str(json, "location");
            config.Printer = Json.Str(json, "printer");
            if (json.ContainsKey("copies")) config.Copies = (int)Json.Number(json, "copies");
            if (json.ContainsKey("gapSeconds")) config.GapSeconds = (int)Json.Number(json, "gapSeconds");
            if (json.ContainsKey("pollSeconds")) config.PollSeconds = Math.Max(2, (int)Json.Number(json, "pollSeconds"));
            config.OpenDrawerOnCash = Json.Bool(json, "openDrawerOnCash");
            return config;
        }
    }

    /// <summary>
    /// The staff login, encrypted to this machine.
    ///
    /// A service cannot be asked for a password at three in the morning, so one
    /// is stored. DPAPI at machine scope means the file is useless if copied
    /// anywhere else; it does NOT protect against someone with administrator
    /// rights on this PC, which is why the account is branch staff and nothing
    /// more.
    /// </summary>
    internal static class Credentials
    {
        private static string File_ { get { return Path.Combine(Config.Folder, "credentials.dat"); } }

        public static void Save(string email, string password)
        {
            Directory.CreateDirectory(Config.Folder);
            byte[] plain = Encoding.UTF8.GetBytes(email + "\n" + password);
            byte[] sealed_ = ProtectedData.Protect(plain, null, DataProtectionScope.LocalMachine);
            File.WriteAllBytes(File_, sealed_);
        }

        public static bool Load(out string email, out string password)
        {
            email = null;
            password = null;
            if (!File.Exists(File_)) return false;
            try
            {
                byte[] plain = ProtectedData.Unprotect(File.ReadAllBytes(File_), null, DataProtectionScope.LocalMachine);
                string[] parts = Encoding.UTF8.GetString(plain).Split('\n');
                if (parts.Length < 2) return false;
                email = parts[0];
                password = parts[1];
                return true;
            }
            catch (Exception e)
            {
                Log.Write("The saved login could not be decrypted: " + e.Message);
                return false;
            }
        }
    }

    /// <summary>
    /// Orders printed here that the server has not yet been told about.
    ///
    /// Without this, a network blip between the paper coming out and the server
    /// being told means the next poll prints the same order again — and a
    /// duplicate ticket in a kitchen becomes a duplicate meal.
    /// </summary>
    internal sealed class PrintedLog
    {
        private readonly HashSet<string> _ids = new HashSet<string>();
        private static string File_ { get { return Path.Combine(Config.Folder, "printed-pending.txt"); } }

        public static PrintedLog Load()
        {
            var log = new PrintedLog();
            try
            {
                if (File.Exists(File_))
                    foreach (string line in File.ReadAllLines(File_))
                        if (line.Trim().Length > 0) log._ids.Add(line.Trim());
            }
            catch (Exception e)
            {
                Log.Write("Could not read the pending-print list: " + e.Message);
            }
            return log;
        }

        public bool Contains(string id) { return _ids.Contains(id); }

        public void Remember(string id)
        {
            if (_ids.Add(id)) Save();
        }

        public void Forget(string id)
        {
            if (_ids.Remove(id)) Save();
        }

        private void Save()
        {
            try
            {
                Directory.CreateDirectory(Config.Folder);
                var ids = new string[_ids.Count];
                _ids.CopyTo(ids);
                File.WriteAllLines(File_, ids);
            }
            catch (Exception e)
            {
                Log.Write("Could not save the pending-print list: " + e.Message);
            }
        }
    }

    internal static class Log
    {
        public static bool ToConsole;
        private static readonly object Lock = new object();

        public static void Write(string message)
        {
            string line = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "  " + message;
            if (ToConsole) Console.WriteLine(line);
            lock (Lock)
            {
                try
                {
                    string folder = Path.Combine(Config.Folder, "logs");
                    Directory.CreateDirectory(folder);
                    File.AppendAllText(Path.Combine(folder, "agent-" + DateTime.Now.ToString("yyyy-MM-dd") + ".log"),
                                       line + Environment.NewLine);
                    Tidy(folder);
                }
                catch
                {
                    // A service that cannot write its log must still print.
                }
            }
        }

        private static DateTime _lastTidy = DateTime.MinValue;

        private static void Tidy(string folder)
        {
            if ((DateTime.Now - _lastTidy).TotalHours < 6) return;
            _lastTidy = DateTime.Now;
            foreach (string file in Directory.GetFiles(folder, "agent-*.log"))
                if (File.GetLastWriteTime(file) < DateTime.Now.AddDays(-14))
                    try { File.Delete(file); } catch { }
        }
    }
}
