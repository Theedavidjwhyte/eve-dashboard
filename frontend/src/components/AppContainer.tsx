import { ThemeProvider } from "@/providers/ThemeProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import App from "@/App";

export default function AppContainer() {
  return (
    <QueryProvider>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Toaster richColors duration={5000} closeButton />
          <App />
        </ThemeProvider>
      </TooltipProvider>
    </QueryProvider>
  );
}
