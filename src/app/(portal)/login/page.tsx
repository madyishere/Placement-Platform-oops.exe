import Link from "next/link";
import { ShieldCheck, ArrowUpRight, GraduationCap } from "lucide-react";
import Login from "@/components/Login";
export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-story">
        <Link className="brand light" href="/">
          <span className="brand-icon">
            <GraduationCap size={26} />
          </span>
          <span>
            Placement Office<small>NATIONAL FORENSIC SCIENCES UNIVERSITY</small>
          </span>
        </Link>
        <div>
          <span className="eyebrow">ONE CAMPUS. COUNTLESS POSSIBILITIES.</span>
          <h1>
            A clear path
            <br />
            to what’s next.
          </h1>
          <p>
            Bringing students, opportunities, and placement decisions together
            in one trusted workspace.
          </p>
          <div className="login-orbit">
            <span>Students</span>
            <span>Opportunities</span>
            <span>
              Outcomes <ArrowUpRight size={18} />
            </span>
          </div>
        </div>
        <small className="login-foot">
          <ShieldCheck size={16} /> Secure access. Accountable decisions.
        </small>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <span className="eyebrow">PLACEMENT SESSION 2026–27</span>
          <h2>Welcome back.</h2>
          <p className="muted">
            Sign in with your institutional placement account.
          </p>
          <Login />
          <p className="login-help">
            Need an account or password assistance?
            <br />
            Contact your Placement Cell administrator.
          </p>
          <Link className="text-link" href="/">
            Back to workspace <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>
    </main>
  );
}
