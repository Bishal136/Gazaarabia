import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Sign In | Gazaarabia",
  description: "Sign in to your Gazaarabia account to manage orders, wishlist, or vendor dashboard.",
};

export default function LoginPage() {
  return <LoginClient />;
}
