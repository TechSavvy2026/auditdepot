import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui-kit";

export default function ComingSoon({ title, subtitle, back = "/dashboard" }: { title: string; subtitle?: string; back?: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="p-6">
        <div className="card text-center py-12">
          <h2 className="font-medium mb-2">Coming soon</h2>
          <p className="text-sm text-gray-500 mb-4">
            This page hasn't been ported yet. Ask me to build it next!
          </p>
          <Link to={back} className="btn-primary">← Back</Link>
        </div>
      </div>
    </div>
  );
}
