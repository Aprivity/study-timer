import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PlanImageStudio } from "@/components/more/PlanImageStudio";

export default function PlanImagePage() {
  return (
    <PageContainer className="plan-image-page">
      <Link href="/more" className="back-link"><ArrowLeft size={17} />返回更多</Link>
      <div className="page-heading">
        <p className="eyebrow">Turn plans into action</p>
        <h1 className="page-title">AI 计划图</h1>
        <p className="page-copy">把你的学习或工作计划告诉 AI，生成一张清晰、适合执行的计划图。</p>
      </div>
      <PlanImageStudio />
    </PageContainer>
  );
}
