import { ComingSoon } from "@/components/ComingSoonModal";
import { FileSearch } from "lucide-react";

const Logs = () => {
  return (
    <ComingSoon
      title="Logs are coming soon!"
      description="Logs are coming soon! We'll let you know when this feature is available."
      icon={FileSearch}
    />
  );
};

export default Logs;

