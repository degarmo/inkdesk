import { generateTempPassword } from "@/lib/passwords";
import { shopUserSchema } from "@/lib/validations";

export type ArtistLoginParse =
  | { wantsLogin: false }
  | { wantsLogin: true; error: string }
  | { wantsLogin: true; login: { name: string; email: string; password: string; role: string } };

export function parseArtistLoginFields(input: {
  createLogin: boolean;
  name: string;
  email: unknown;
  password: string;
  role: unknown;
}): ArtistLoginParse {
  if (!input.createLogin) {
    return { wantsLogin: false };
  }

  const password = input.password.trim() || generateTempPassword();
  const parsed = shopUserSchema.safeParse({
    name: input.name,
    email: input.email,
    password,
    role: input.role || "staff",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path.includes("email")) {
      return {
        wantsLogin: true,
        error: "Enter a login email, or uncheck Create a shop login.",
      };
    }
    return { wantsLogin: true, error: issue?.message ?? "Check the login fields and try again." };
  }
  if (parsed.data.role === "owner") {
    return {
      wantsLogin: true,
      error: "Create staff or admin here. Use Admin → Users if you need another owner.",
    };
  }
  return { wantsLogin: true, login: parsed.data };
}
