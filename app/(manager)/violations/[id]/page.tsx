import ViolationDetail from "./ViolationDetail";

interface ViolationDetailPageProps {
  params: {
    id: string;
  };
}

export default function ViolationDetailPage({
  params,
}: ViolationDetailPageProps) {
  return <ViolationDetail id={params.id} />;
}
