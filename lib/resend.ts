import { Resend } from "resend";

let resend: Resend | null = null;

export function getResend(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY || "re_placeholder";
    resend = new Resend(apiKey);
  }
  return resend;
}

export default getResend;
