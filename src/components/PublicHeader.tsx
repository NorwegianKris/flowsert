import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { NavLink } from '@/components/NavLink';

interface PublicHeaderProps {
  onLogin?: () => void;
}

export function PublicHeader({ onLogin }: PublicHeaderProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
    } else {
      navigate('/auth');
    }
  };

  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="cursor-pointer" onClick={() => navigate('/auth')}>
              <Logo />
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <NavLink 
                to="/about" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                activeClassName="text-foreground font-medium"
              >
                About
              </NavLink>
              <NavLink 
                to="/faq" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                activeClassName="text-foreground font-medium"
              >
                FAQ
              </NavLink>
              <NavLink 
                to="/contact" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                activeClassName="text-foreground font-medium"
              >
                Contact
              </NavLink>
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleLogin}>
              Log In
            </Button>
            <Button onClick={() => navigate('/contact')}>
              Get in Touch
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
