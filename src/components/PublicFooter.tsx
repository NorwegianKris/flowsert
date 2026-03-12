import { Link } from 'react-router-dom';

export function PublicFooter() {
  return (
    <footer className="border-t border-border/50 bg-card/80 py-8">
      <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
            <p className="text-sm text-muted-foreground">
              &copy; 2026 FlowSert. All rights reserved.
            </p>
            <nav className="flex flex-wrap items-center gap-4 md:gap-6">
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link to="/subprocessors" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sub-Processors
              </Link>
              <Link to="/security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Security
              </Link>
              <Link to="/trust" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Trust
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
