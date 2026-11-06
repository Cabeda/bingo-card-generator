import { EventWorkspace } from "../../components/EventWorkspace/EventWorkspace";

import HostPrototype from "../../components/EventWorkspace/host-prototype/HostPrototype";

export default async function Page({ searchParams }: {
  searchParams: Promise<{ variant?: string }>;
}): Promise<React.JSX.Element> {
  const { variant } = await searchParams;
  if (process.env.NODE_ENV !== "production" && variant) return <HostPrototype />;
  return <EventWorkspace entry="host" />;
}
