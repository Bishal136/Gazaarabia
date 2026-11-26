"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import React from "react";

interface Props {
  children: React.ReactNode;
  session?: Session | null;
}

export default function SessionProviderWrapper({ children, session }: Props) {
  return (
    <SessionProvider basePath="/api/auth" session={session}>
      {children}
    </SessionProvider>
  );
}
