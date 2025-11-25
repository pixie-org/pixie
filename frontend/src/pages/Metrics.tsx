import { ComingSoon } from "@/components/ComingSoonModal";
import { BarChart } from "lucide-react";

const Metrics = () => {
  return (
    <ComingSoon
      title="Metrics are coming soon!"
      description="Metrics are coming soon! We'll let you know when this feature is available."
      icon={BarChart}
    />
  );
};

export default Metrics;

