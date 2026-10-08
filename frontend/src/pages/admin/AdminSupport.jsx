import { useParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import SupportQueue from "../support/SupportQueue";
import SupportDetails from "../support/SupportDetails";

export default function AdminSupport() {
  const { ticketId } = useParams();
  return <AdminLayout><h1 className="text-2xl font-bold sm:text-3xl">Support &amp; appeals</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-600">Review member requests, request clarification, and record decisions. Appeals must be handled by an admin who did not make the original decision.</p>{ticketId ? <SupportDetails ticketId={ticketId} staff /> : <SupportQueue staff />}</AdminLayout>;
}
