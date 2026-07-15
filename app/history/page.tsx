import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HistoryList } from "@/components/history/HistoryList";
import { PageContainer } from "@/components/layout/PageContainer";

export default function HistoryPage() {
  return <PageContainer><Link href="/" className="back-link"><ArrowLeft size={17} />返回计时器</Link><div className="page-heading"><p className="eyebrow">Your quiet progress</p><h1 className="page-title">专注历史</h1><p className="page-copy">每一次认真投入的时间，都值得被看见。</p></div><HistoryList /></PageContainer>;
}
