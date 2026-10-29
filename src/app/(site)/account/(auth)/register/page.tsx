import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Create Account | Gazaarabia",
  description: "Join Gazaarabia as a Customer or Seller with email verification.",
};

export default function RegisterPage() {
  return <RegisterClient />;
}
