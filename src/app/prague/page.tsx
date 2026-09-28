import { ChgkLiveBoard } from "@/components/ChgkLiveBoard";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/16nsdiqD9cd4Uw-XLH1TTrAhmG0EstAHvRCL_bVml0fc/edit?usp=sharing";

export default function PraguePage() {
  return (
    <ChgkLiveBoard
      apiPath="/api/prague"
      title="Pražma 2026. Пражский полумарафон: 15 часов ЧГК"
      backHref="/prazma"
      backLabel="Пражма"
      sheetUrl={SHEET_URL}
      pageId="prague"
      adminCsvHref="/api/admin/prague-tournament-csv"
    />
  );
}
