import ProfileClient from "@frontend/components/ProfileClient";

interface Props {
  params: Promise<{ id: string }>;
}

/** Profile detail page — thin shell that delegates to the client component. */
export default async function ProfilePage({ params }: Props) {
  const { id } = await params;
  return <ProfileClient profileId={id} />;
}
