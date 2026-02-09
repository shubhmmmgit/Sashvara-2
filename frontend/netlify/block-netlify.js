export default async (request, context) => {
  const host = request.headers.get("host") || "";
  if (host.endsWith(".netlify.app") && !host.includes("sashvara.com")) {
    return new Response("Not allowed", { status: 403 });
  }
  // continue normally for your custom domain
  return context.next();
};
