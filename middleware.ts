import { auth } from "@/lib/server/auth";

export default auth;

export const config = {
  matcher: ["/chat/:path*", "/setup/:path*"],
};
