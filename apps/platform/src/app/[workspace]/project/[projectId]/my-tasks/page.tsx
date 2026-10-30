import type { Metadata } from "next";
import { MyTasks } from "@/components/dashboard/my-tasks/my-tasks";

export const metadata: Metadata = {
  title: "My tasks",
  description: "Your weekly update on the tasks you own",
};

export default function RouteComponent() {
  return <MyTasks />;
}
