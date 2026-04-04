import * as React from "react";

export function HeroSection({ className, ...props }: Readonly<React.HTMLAttributes<HTMLElement>>) {
  return (
    <section className={`py-24 px-4 bg-gradient-to-b from-background to-muted/50 ${className ?? ""}`} {...props}>
      <div className="container mx-auto text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Build with <span className="text-primary">Evo Design System</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Beautiful, accessible components and blocks built with Tailwind CSS and Radix UI. Copy, paste, and
              customize to build your next project.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              Get Started
            </button>
            <button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              View Components
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
