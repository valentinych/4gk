import { TableWidgetClient } from "@/components/page-widgets/TableWidgetClient";

export function OchchQuizPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-3 text-sm leading-relaxed">
        <p className="font-medium">🎸 THIRD TIME’S A CHARM! 🎸</p>
        <p>Третий авторский музыкальный квиз от Андрея Ярмолы!</p>
        <p>
          В этом году вас ждёт смесь классического музыкального квиза и мозгового
          штурма. Восемь туров отличной музыки — без искажений, обработки ИИ и
          прочих издевательств над оригиналами.
        </p>
        <p>
          Как всегда, никакой русскоязычной музыки. Много знакомого и незнакомого,
          очевидного и неожиданного. Придётся не только слушать, но и думать!
        </p>
        <p>📊 Для любителей статистики:</p>
        <p>🌍 70% музыки на английском, 30% — на других языках.</p>
        <p>📀 60% музыки из XX века, 40% — из XXI.</p>
        <p>Только хорошая музыка!</p>
      </div>
      <TableWidgetClient apiPath="/api/ochch/quiz" />
    </div>
  );
}
