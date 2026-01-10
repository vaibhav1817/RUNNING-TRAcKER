import { NavLink } from "react-router-dom";
import { Home, Map, Activity, Calendar, User, Users } from "lucide-react";

export default function BottomNav() {
  return (
    <div className="bottom-nav">
      <NavLink to="/" className="nav-item">
        <Home className="nav-icon" size={24} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/community" className="nav-item">
        <Users className="nav-icon" size={24} />
        <span>Social</span>
      </NavLink>
      <NavLink to="/maps" className="nav-item">
        <Map className="nav-icon" size={24} />
        <span>Maps</span>
      </NavLink>
      <NavLink to="/activity" className="nav-item">
        <Activity className="nav-icon" size={24} />
        <span>Activity</span>
      </NavLink>
      <NavLink to="/plan" className="nav-item">
        <Calendar className="nav-icon" size={24} />
        <span>Plan</span>
      </NavLink>
      <NavLink to="/profile" className="nav-item">
        <User className="nav-icon" size={24} />
        <span>Profile</span>
      </NavLink>
    </div>
  );
}
