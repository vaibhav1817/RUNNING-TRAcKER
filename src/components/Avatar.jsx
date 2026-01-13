import { User } from "lucide-react";

export default function Avatar({ user, size = 40, showBorder = false }) {
    // 1. Resolve Image URL
    // Structure might be user.profile.profilePicture OR user.profilePicture depending on endpoint
    const src = user?.profile?.profilePicture || user?.profilePicture;
    const name = user?.username || user?.name || "User";

    // 2. Generate a deterministic but random-looking silhouette background color (optional)
    // or just stick to the requested "provided" look (Grey/Black)
    // The provided image was Silver/Grey circles with Black icons.
    const bgColor = "#e2e8f0"; // slate-200
    const iconColor = "#1e293b"; // slate-800

    if (src) {
        return (
            <img
                src={src}
                alt={name}
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: showBorder ? '2px solid white' : 'none',
                    backgroundColor: '#334155'
                }}
            />
        );
    }

    return (
        <div
            style={{
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                backgroundColor: bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: showBorder ? '2px solid white' : 'none'
            }}
        >
            <User size={size * 0.6} color={iconColor} strokeWidth={2.5} />
        </div>
    );
}
