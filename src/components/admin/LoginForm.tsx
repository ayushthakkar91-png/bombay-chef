"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/_actions/auth";
import { IDLE } from "@/lib/admin/validation";
import { Banner, Field, SubmitButton, TextInput } from "./primitives";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(login, IDLE);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <Banner state={state} />

      <Field label="Email" htmlFor="email" error={state.errors?.email} required>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          defaultValue={state.values?.email}
          placeholder="Enter your email"
        />
      </Field>

      <Field label="Password" htmlFor="password" error={state.errors?.password} required>
        <TextInput id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" />
      </Field>

      <SubmitButton pendingLabel="Signing in…" className="mt-1 w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
