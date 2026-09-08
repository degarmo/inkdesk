import { FormMessage } from "@/components/ui/field";

export function FlashNotice({
  saved,
  message,
}: {
  saved?: string;
  message: string;
}) {
  if (saved !== "1") return null;
  return <FormMessage success={message} />;
}
