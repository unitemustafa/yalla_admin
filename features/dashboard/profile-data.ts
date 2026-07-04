export const currentUser = {
  initials: "MA",
  fullName: "Mohamed Abdeljalel",
  role: "Manager",
  email: "m.abdeljalel@yalla-market.com",
  phone: "+20 112 240 1581",
  username: "m.abdeljalel",
  location: "Cairo, Egypt",
  branch: "اول اونلاين ماركت في التل الكبير",
  joinedAt: "May 2026",
  lastLogin: "Today, 4:12 PM",
};

export const accountInfo = [
  { label: "Username", value: currentUser.username },
  { label: "Email", value: currentUser.email },
  { label: "Phone", value: currentUser.phone },
  { label: "Default branch", value: currentUser.branch },
];

export const profileDetails = [
  { label: "Role", value: currentUser.role },
  { label: "Location", value: currentUser.location },
  { label: "Joined", value: currentUser.joinedAt },
  { label: "Last login", value: currentUser.lastLogin },
];
