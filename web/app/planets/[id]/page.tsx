import { getAllPlanetIds } from "@/lib/data";
import PlanetDetail from "@/components/PlanetDetail";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPlanetIds().map((id) => ({ id }));
}

export default async function PlanetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlanetDetail id={id} />;
}
