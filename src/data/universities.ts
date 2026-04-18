export type University = {
  name: string;
  country: string;
  program: string;
  degree: string;
  stream: string;
  deadline: string;
  scholarshipUrl: string;
  match: number;
  tuition: string;
  acceptanceRate: string;
  difficulty: "Easy" | "Moderate" | "Hard" | "Very Hard";
  ranking: number;
  city?: string;
  hostel?: "Excellent" | "Good" | "Average" | "Limited";
  campus?: "Sprawling" | "Modern" | "Compact" | "Urban";
};

// Difficulty → minimum grade tier required
export const DIFFICULTY_MIN_TIER: Record<University["difficulty"], number> = {
  "Very Hard": 4, // top
  "Hard": 3,      // high
  "Moderate": 2,  // average
  "Easy": 1,      // low
};

// Grade tier ranking
export const TIER_RANK: Record<string, number> = {
  top: 4,
  high: 3,
  average: 2,
  low: 1,
};

// Auto-derive a grade tier from free-text grades input
export const deriveGradeTier = (grades: string | null | undefined): "top" | "high" | "average" | "low" => {
  if (!grades) return "average";
  const g = grades.toLowerCase();
  // Percentages
  const pctMatch = g.match(/(\d{2,3})\s*%/);
  if (pctMatch) {
    const p = parseInt(pctMatch[1]);
    if (p >= 90) return "top";
    if (p >= 75) return "high";
    if (p >= 60) return "average";
    return "low";
  }
  // GPA
  const gpaMatch = g.match(/(\d\.\d{1,2})/);
  if (gpaMatch) {
    const gpa = parseFloat(gpaMatch[1]);
    if (gpa >= 3.8) return "top";
    if (gpa >= 3.3) return "high";
    if (gpa >= 2.5) return "average";
    return "low";
  }
  // A-levels
  if (/a\*a\*|aaa|a\*aa/.test(g)) return "top";
  if (/aab|abb/.test(g)) return "high";
  if (/bbb|bbc/.test(g)) return "average";
  if (/ccc|cdd|ddd/.test(g)) return "low";
  // Keywords
  if (/(top|excellent|distinction|topper)/.test(g)) return "top";
  if (/(good|first class|merit)/.test(g)) return "high";
  if (/(average|second class|pass)/.test(g)) return "average";
  if (/(barely|low|fail|third)/.test(g)) return "low";
  return "average";
};

export const ALL_UNIS: University[] = [
  // ============ INDIA — ENGINEERING (CS / IT / AI) ============
  { name: "IIT Bombay", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jun 15, 2026", scholarshipUrl: "https://www.iitb.ac.in/", match: 95, tuition: "₹2,00,000/yr", acceptanceRate: "2%", difficulty: "Very Hard", ranking: 149, city: "Mumbai", hostel: "Good", campus: "Sprawling" },
  { name: "IIT Delhi", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jun 15, 2026", scholarshipUrl: "https://home.iitd.ac.in/", match: 94, tuition: "₹2,00,000/yr", acceptanceRate: "1.5%", difficulty: "Very Hard", ranking: 150, city: "New Delhi", hostel: "Good", campus: "Sprawling" },
  { name: "IIT Madras", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jun 15, 2026", scholarshipUrl: "https://www.iitm.ac.in/", match: 93, tuition: "₹2,00,000/yr", acceptanceRate: "2%", difficulty: "Very Hard", ranking: 227, city: "Chennai", hostel: "Excellent", campus: "Sprawling" },
  { name: "IIT Kanpur", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jun 15, 2026", scholarshipUrl: "https://www.iitk.ac.in/", match: 91, tuition: "₹2,00,000/yr", acceptanceRate: "2.5%", difficulty: "Very Hard", ranking: 278, city: "Kanpur", hostel: "Good", campus: "Sprawling" },
  { name: "IIT Roorkee", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jun 15, 2026", scholarshipUrl: "https://www.iitr.ac.in/", match: 90, tuition: "₹2,00,000/yr", acceptanceRate: "3%", difficulty: "Very Hard", ranking: 369, city: "Roorkee", hostel: "Good", campus: "Sprawling" },
  { name: "IIT Guwahati", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jun 15, 2026", scholarshipUrl: "https://www.iitg.ac.in/", match: 89, tuition: "₹2,00,000/yr", acceptanceRate: "3.5%", difficulty: "Very Hard", ranking: 384, city: "Guwahati", hostel: "Excellent", campus: "Sprawling" },
  { name: "IIIT Hyderabad", country: "India", program: "Computer Science", degree: "BTech", stream: "Computer Science", deadline: "Jun 15, 2026", scholarshipUrl: "https://www.iiit.ac.in/", match: 88, tuition: "₹3,00,000/yr", acceptanceRate: "4%", difficulty: "Hard", ranking: 500, city: "Hyderabad", hostel: "Good", campus: "Modern" },
  { name: "BITS Pilani", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jul 1, 2026", scholarshipUrl: "https://www.bits-pilani.ac.in/", match: 87, tuition: "₹5,00,000/yr", acceptanceRate: "5%", difficulty: "Hard", ranking: 450, city: "Pilani", hostel: "Good", campus: "Sprawling" },
  { name: "IIIT Bangalore", country: "India", program: "Computer Science", degree: "BTech", stream: "Computer Science", deadline: "Jun 30, 2026", scholarshipUrl: "https://www.iiitb.ac.in/", match: 85, tuition: "₹3,50,000/yr", acceptanceRate: "6%", difficulty: "Hard", ranking: 600, city: "Bangalore", hostel: "Good", campus: "Modern" },
  { name: "DTU Delhi", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jun 25, 2026", scholarshipUrl: "https://dtu.ac.in/", match: 83, tuition: "₹1,90,000/yr", acceptanceRate: "8%", difficulty: "Hard", ranking: 750, city: "New Delhi", hostel: "Average", campus: "Compact" },
  { name: "NSUT Delhi", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jun 25, 2026", scholarshipUrl: "https://nsut.ac.in/", match: 82, tuition: "₹1,75,000/yr", acceptanceRate: "9%", difficulty: "Hard", ranking: 780, city: "New Delhi", hostel: "Average", campus: "Compact" },
  { name: "VIT Vellore", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Apr 30, 2026", scholarshipUrl: "https://vit.ac.in/", match: 78, tuition: "₹3,50,000/yr", acceptanceRate: "30%", difficulty: "Moderate", ranking: 800, city: "Vellore", hostel: "Excellent", campus: "Sprawling" },
  { name: "SRM University", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "May 15, 2026", scholarshipUrl: "https://www.srmist.edu.in/", match: 75, tuition: "₹3,00,000/yr", acceptanceRate: "45%", difficulty: "Moderate", ranking: 900, city: "Chennai", hostel: "Excellent", campus: "Sprawling" },
  { name: "Manipal Institute of Technology", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "May 1, 2026", scholarshipUrl: "https://manipal.edu/mit.html", match: 76, tuition: "₹4,00,000/yr", acceptanceRate: "35%", difficulty: "Moderate", ranking: 850, city: "Manipal", hostel: "Excellent", campus: "Sprawling" },
  { name: "Thapar University", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "May 20, 2026", scholarshipUrl: "https://www.thapar.edu/", match: 73, tuition: "₹2,80,000/yr", acceptanceRate: "40%", difficulty: "Moderate", ranking: 950, city: "Patiala", hostel: "Good", campus: "Modern" },
  { name: "Shiv Nadar University", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "May 31, 2026", scholarshipUrl: "https://snu.edu.in/", match: 77, tuition: "₹5,50,000/yr", acceptanceRate: "25%", difficulty: "Moderate", ranking: 700, city: "Greater Noida", hostel: "Excellent", campus: "Modern" },
  { name: "Chandigarh University", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jul 10, 2026", scholarshipUrl: "https://www.cuchd.in/", match: 64, tuition: "₹2,20,000/yr", acceptanceRate: "65%", difficulty: "Easy", ranking: 1100, city: "Mohali", hostel: "Good", campus: "Modern" },
  { name: "Lovely Professional University", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jul 15, 2026", scholarshipUrl: "https://www.lpu.in/", match: 62, tuition: "₹2,50,000/yr", acceptanceRate: "75%", difficulty: "Easy", ranking: 1400, city: "Phagwara", hostel: "Good", campus: "Sprawling" },
  { name: "Amity University", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jun 30, 2026", scholarshipUrl: "https://www.amity.edu/", match: 65, tuition: "₹3,00,000/yr", acceptanceRate: "70%", difficulty: "Easy", ranking: 1200, city: "Noida", hostel: "Good", campus: "Modern" },
  { name: "Galgotias University", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jul 30, 2026", scholarshipUrl: "https://www.galgotiasuniversity.edu.in/", match: 58, tuition: "₹1,60,000/yr", acceptanceRate: "85%", difficulty: "Easy", ranking: 1600, city: "Greater Noida", hostel: "Average", campus: "Modern" },
  { name: "Sharda University", country: "India", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jul 30, 2026", scholarshipUrl: "https://www.sharda.ac.in/", match: 55, tuition: "₹1,80,000/yr", acceptanceRate: "90%", difficulty: "Easy", ranking: 1700, city: "Greater Noida", hostel: "Average", campus: "Modern" },

  // ============ INDIA — MECHANICAL / CIVIL / ELECTRICAL ============
  { name: "IIT Kharagpur", country: "India", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jun 15, 2026", scholarshipUrl: "https://www.iitkgp.ac.in/", match: 92, tuition: "₹2,00,000/yr", acceptanceRate: "2.5%", difficulty: "Very Hard", ranking: 270, city: "Kharagpur", hostel: "Good", campus: "Sprawling" },
  { name: "NIT Trichy", country: "India", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jun 20, 2026", scholarshipUrl: "https://www.nitt.edu/", match: 82, tuition: "₹1,50,000/yr", acceptanceRate: "8%", difficulty: "Hard", ranking: 600, city: "Tiruchirappalli", hostel: "Good", campus: "Sprawling" },
  { name: "NIT Warangal", country: "India", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jun 20, 2026", scholarshipUrl: "https://www.nitw.ac.in/", match: 80, tuition: "₹1,50,000/yr", acceptanceRate: "10%", difficulty: "Hard", ranking: 650, city: "Warangal", hostel: "Good", campus: "Sprawling" },
  { name: "NIT Surathkal", country: "India", program: "Engineering", degree: "BTech", stream: "Civil", deadline: "Jun 20, 2026", scholarshipUrl: "https://www.nitk.ac.in/", match: 79, tuition: "₹1,50,000/yr", acceptanceRate: "11%", difficulty: "Hard", ranking: 670, city: "Mangalore", hostel: "Good", campus: "Sprawling" },
  { name: "COEP Pune", country: "India", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jun 25, 2026", scholarshipUrl: "https://www.coep.org.in/", match: 76, tuition: "₹90,000/yr", acceptanceRate: "15%", difficulty: "Hard", ranking: 850, city: "Pune", hostel: "Average", campus: "Compact" },
  { name: "PSG College of Tech", country: "India", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jul 1, 2026", scholarshipUrl: "https://www.psgtech.edu/", match: 72, tuition: "₹85,000/yr", acceptanceRate: "25%", difficulty: "Moderate", ranking: 950, city: "Coimbatore", hostel: "Good", campus: "Compact" },
  { name: "RV College of Engineering", country: "India", program: "Engineering", degree: "BTech", stream: "Electrical", deadline: "Jun 30, 2026", scholarshipUrl: "https://www.rvce.edu.in/", match: 74, tuition: "₹2,00,000/yr", acceptanceRate: "20%", difficulty: "Moderate", ranking: 900, city: "Bangalore", hostel: "Average", campus: "Urban" },

  // ============ INDIA — COMMERCE / BUSINESS / BBA ============
  { name: "Shri Ram College of Commerce", country: "India", program: "Business", degree: "BBA", stream: "Finance", deadline: "Jul 5, 2026", scholarshipUrl: "https://www.srcc.edu/", match: 90, tuition: "₹50,000/yr", acceptanceRate: "1.5%", difficulty: "Very Hard", ranking: 320, city: "New Delhi", hostel: "Limited", campus: "Compact" },
  { name: "St Xavier's Mumbai", country: "India", program: "Business", degree: "BBA", stream: "Finance", deadline: "Jul 10, 2026", scholarshipUrl: "https://xaviers.edu/", match: 86, tuition: "₹60,000/yr", acceptanceRate: "5%", difficulty: "Hard", ranking: 480, city: "Mumbai", hostel: "Limited", campus: "Compact" },
  { name: "NMIMS Mumbai", country: "India", program: "Business", degree: "BBA", stream: "Marketing", deadline: "Apr 15, 2026", scholarshipUrl: "https://www.nmims.edu/", match: 80, tuition: "₹4,50,000/yr", acceptanceRate: "12%", difficulty: "Hard", ranking: 700, city: "Mumbai", hostel: "Good", campus: "Urban" },
  { name: "Symbiosis Pune", country: "India", program: "Business", degree: "BBA", stream: "Marketing", deadline: "May 5, 2026", scholarshipUrl: "https://www.symbiosis.ac.in/", match: 78, tuition: "₹3,80,000/yr", acceptanceRate: "20%", difficulty: "Moderate", ranking: 800, city: "Pune", hostel: "Good", campus: "Modern" },
  { name: "Christ University Bangalore", country: "India", program: "Business", degree: "BBA", stream: "General", deadline: "Apr 30, 2026", scholarshipUrl: "https://christuniversity.in/", match: 75, tuition: "₹2,20,000/yr", acceptanceRate: "30%", difficulty: "Moderate", ranking: 850, city: "Bangalore", hostel: "Good", campus: "Urban" },
  { name: "IIM Indore IPM", country: "India", program: "Business", degree: "BBA", stream: "General", deadline: "Mar 31, 2026", scholarshipUrl: "https://www.iimidr.ac.in/", match: 92, tuition: "₹4,00,000/yr", acceptanceRate: "2%", difficulty: "Very Hard", ranking: 200, city: "Indore", hostel: "Excellent", campus: "Modern" },

  // ============ INDIA — ARTS / HUMANITIES ============
  { name: "Lady Shri Ram College", country: "India", program: "Arts", degree: "BA", stream: "Psychology", deadline: "Jul 5, 2026", scholarshipUrl: "https://lsr.edu.in/", match: 88, tuition: "₹40,000/yr", acceptanceRate: "3%", difficulty: "Very Hard", ranking: 350, city: "New Delhi", hostel: "Good", campus: "Compact" },
  { name: "Hindu College Delhi", country: "India", program: "Arts", degree: "BA", stream: "Economics", deadline: "Jul 5, 2026", scholarshipUrl: "https://www.hinducollege.ac.in/", match: 85, tuition: "₹35,000/yr", acceptanceRate: "4%", difficulty: "Hard", ranking: 420, city: "New Delhi", hostel: "Average", campus: "Compact" },
  { name: "Loyola College Chennai", country: "India", program: "Arts", degree: "BA", stream: "Psychology", deadline: "Jun 30, 2026", scholarshipUrl: "https://www.loyolacollege.edu/", match: 78, tuition: "₹50,000/yr", acceptanceRate: "20%", difficulty: "Moderate", ranking: 750, city: "Chennai", hostel: "Limited", campus: "Compact" },
  { name: "Jamia Millia Islamia", country: "India", program: "Arts", degree: "BA", stream: "General", deadline: "Jun 25, 2026", scholarshipUrl: "https://www.jmi.ac.in/", match: 72, tuition: "₹15,000/yr", acceptanceRate: "30%", difficulty: "Moderate", ranking: 800, city: "New Delhi", hostel: "Average", campus: "Sprawling" },
  { name: "Banaras Hindu University", country: "India", program: "Arts", degree: "BA", stream: "General", deadline: "Jun 30, 2026", scholarshipUrl: "https://www.bhu.ac.in/", match: 70, tuition: "₹10,000/yr", acceptanceRate: "40%", difficulty: "Moderate", ranking: 900, city: "Varanasi", hostel: "Good", campus: "Sprawling" },

  // ============ INDIA — MEDICINE ============
  { name: "AIIMS Delhi", country: "India", program: "Medicine", degree: "MBBS", stream: "General", deadline: "May 15, 2026", scholarshipUrl: "https://www.aiims.edu/", match: 96, tuition: "₹6,000/yr", acceptanceRate: "0.5%", difficulty: "Very Hard", ranking: 100, city: "New Delhi", hostel: "Good", campus: "Compact" },
  { name: "JIPMER Puducherry", country: "India", program: "Medicine", degree: "MBBS", stream: "General", deadline: "May 20, 2026", scholarshipUrl: "https://www.jipmer.edu.in/", match: 92, tuition: "₹15,000/yr", acceptanceRate: "1%", difficulty: "Very Hard", ranking: 250, city: "Puducherry", hostel: "Good", campus: "Compact" },
  { name: "CMC Vellore", country: "India", program: "Medicine", degree: "MBBS", stream: "General", deadline: "Apr 30, 2026", scholarshipUrl: "https://www.cmch-vellore.edu/", match: 90, tuition: "₹50,000/yr", acceptanceRate: "1.5%", difficulty: "Very Hard", ranking: 280, city: "Vellore", hostel: "Good", campus: "Compact" },
  { name: "Kasturba Medical College", country: "India", program: "Medicine", degree: "MBBS", stream: "General", deadline: "May 30, 2026", scholarshipUrl: "https://manipal.edu/kmc-manipal.html", match: 76, tuition: "₹15,00,000/yr", acceptanceRate: "15%", difficulty: "Moderate", ranking: 600, city: "Manipal", hostel: "Excellent", campus: "Modern" },

  // ============ INDIA — DESIGN / LAW ============
  { name: "NID Ahmedabad", country: "India", program: "Design", degree: "BA", stream: "General", deadline: "Mar 1, 2026", scholarshipUrl: "https://www.nid.edu/", match: 90, tuition: "₹3,00,000/yr", acceptanceRate: "2%", difficulty: "Very Hard", ranking: 300, city: "Ahmedabad", hostel: "Good", campus: "Modern" },
  { name: "NLSIU Bangalore", country: "India", program: "Law", degree: "BA", stream: "General", deadline: "May 10, 2026", scholarshipUrl: "https://www.nls.ac.in/", match: 93, tuition: "₹3,50,000/yr", acceptanceRate: "1%", difficulty: "Very Hard", ranking: 200, city: "Bangalore", hostel: "Good", campus: "Compact" },
  { name: "Symbiosis Law School", country: "India", program: "Law", degree: "BA", stream: "General", deadline: "Apr 30, 2026", scholarshipUrl: "https://www.symlaw.ac.in/", match: 76, tuition: "₹3,80,000/yr", acceptanceRate: "20%", difficulty: "Moderate", ranking: 700, city: "Pune", hostel: "Good", campus: "Modern" },

  // ============ USA ============
  { name: "MIT", country: "USA", program: "Computer Science", degree: "BTech", stream: "Computer Science", deadline: "Jan 1, 2026", scholarshipUrl: "https://sfs.mit.edu/", match: 95, tuition: "$57,590/yr", acceptanceRate: "3.9%", difficulty: "Very Hard", ranking: 1, city: "Cambridge MA", hostel: "Excellent", campus: "Urban" },
  { name: "Stanford University", country: "USA", program: "Computer Science", degree: "MS", stream: "Computer Science", deadline: "Jan 5, 2026", scholarshipUrl: "https://financialaid.stanford.edu/", match: 92, tuition: "$56,169/yr", acceptanceRate: "4.3%", difficulty: "Very Hard", ranking: 3, city: "Stanford CA", hostel: "Excellent", campus: "Sprawling" },
  { name: "Carnegie Mellon", country: "USA", program: "Computer Science", degree: "BTech", stream: "Computer Science", deadline: "Jan 2, 2026", scholarshipUrl: "https://www.cmu.edu/sfs/", match: 90, tuition: "$58,924/yr", acceptanceRate: "13.5%", difficulty: "Hard", ranking: 5, city: "Pittsburgh", hostel: "Good", campus: "Urban" },
  { name: "Georgia Tech", country: "USA", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Feb 1, 2026", scholarshipUrl: "https://finaid.gatech.edu/", match: 86, tuition: "$33,020/yr", acceptanceRate: "17%", difficulty: "Hard", ranking: 12, city: "Atlanta", hostel: "Good", campus: "Urban" },
  { name: "Purdue University", country: "USA", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Feb 1, 2026", scholarshipUrl: "https://www.purdue.edu/financialaid/", match: 80, tuition: "$31,104/yr", acceptanceRate: "53%", difficulty: "Moderate", ranking: 43, city: "West Lafayette", hostel: "Good", campus: "Sprawling" },
  { name: "University of Illinois", country: "USA", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jan 15, 2026", scholarshipUrl: "https://osfa.illinois.edu/", match: 84, tuition: "$34,316/yr", acceptanceRate: "45%", difficulty: "Moderate", ranking: 33, city: "Urbana", hostel: "Good", campus: "Sprawling" },
  { name: "Arizona State University", country: "USA", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Mar 1, 2026", scholarshipUrl: "https://students.asu.edu/scholarships", match: 72, tuition: "$29,000/yr", acceptanceRate: "88%", difficulty: "Easy", ranking: 185, city: "Tempe", hostel: "Good", campus: "Sprawling" },
  { name: "University of Cincinnati", country: "USA", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Mar 1, 2026", scholarshipUrl: "https://www.uc.edu/", match: 70, tuition: "$28,000/yr", acceptanceRate: "84%", difficulty: "Easy", ranking: 220, city: "Cincinnati", hostel: "Average", campus: "Urban" },
  { name: "San Jose State University", country: "USA", program: "Computer Science", degree: "BTech", stream: "Computer Science", deadline: "Nov 30, 2025", scholarshipUrl: "https://www.sjsu.edu/", match: 74, tuition: "$19,380/yr", acceptanceRate: "67%", difficulty: "Moderate", ranking: 250, city: "San Jose", hostel: "Limited", campus: "Urban" },
  { name: "NYU Stern", country: "USA", program: "Business", degree: "BBA", stream: "Finance", deadline: "Jan 5, 2026", scholarshipUrl: "https://www.stern.nyu.edu/", match: 88, tuition: "$60,438/yr", acceptanceRate: "12%", difficulty: "Hard", ranking: 30, city: "New York", hostel: "Limited", campus: "Urban" },
  { name: "Boston University", country: "USA", program: "Arts", degree: "BA", stream: "Psychology", deadline: "Jan 4, 2026", scholarshipUrl: "https://www.bu.edu/finaid/", match: 76, tuition: "$63,798/yr", acceptanceRate: "20%", difficulty: "Moderate", ranking: 90, city: "Boston", hostel: "Good", campus: "Urban" },

  // ============ UK ============
  { name: "University of Oxford", country: "UK", program: "Engineering", degree: "BS", stream: "Mechanical", deadline: "Oct 15, 2025", scholarshipUrl: "https://www.ox.ac.uk/", match: 88, tuition: "£37,510/yr", acceptanceRate: "15.4%", difficulty: "Hard", ranking: 4, city: "Oxford", hostel: "Excellent", campus: "Compact" },
  { name: "University of Cambridge", country: "UK", program: "Engineering", degree: "BS", stream: "Mechanical", deadline: "Oct 15, 2025", scholarshipUrl: "https://www.cambridgetrust.org/", match: 87, tuition: "£35,517/yr", acceptanceRate: "21%", difficulty: "Hard", ranking: 2, city: "Cambridge", hostel: "Excellent", campus: "Compact" },
  { name: "Imperial College London", country: "UK", program: "Engineering", degree: "BS", stream: "Computer Science", deadline: "Jan 15, 2026", scholarshipUrl: "https://www.imperial.ac.uk/", match: 86, tuition: "£35,100/yr", acceptanceRate: "14%", difficulty: "Hard", ranking: 6, city: "London", hostel: "Good", campus: "Urban" },
  { name: "LSE", country: "UK", program: "Business", degree: "BS", stream: "Finance", deadline: "Jan 25, 2026", scholarshipUrl: "https://www.lse.ac.uk/", match: 89, tuition: "£25,800/yr", acceptanceRate: "8.9%", difficulty: "Hard", ranking: 45, city: "London", hostel: "Limited", campus: "Urban" },
  { name: "University of Manchester", country: "UK", program: "Engineering", degree: "BS", stream: "Mechanical", deadline: "Jan 25, 2026", scholarshipUrl: "https://www.manchester.ac.uk/", match: 78, tuition: "£27,000/yr", acceptanceRate: "55%", difficulty: "Moderate", ranking: 34, city: "Manchester", hostel: "Good", campus: "Urban" },
  { name: "University of Leeds", country: "UK", program: "Engineering", degree: "BS", stream: "Mechanical", deadline: "Jan 25, 2026", scholarshipUrl: "https://www.leeds.ac.uk/", match: 73, tuition: "£25,750/yr", acceptanceRate: "72%", difficulty: "Moderate", ranking: 75, city: "Leeds", hostel: "Good", campus: "Urban" },
  { name: "Coventry University", country: "UK", program: "Engineering", degree: "BS", stream: "Mechanical", deadline: "Jul 1, 2026", scholarshipUrl: "https://www.coventry.ac.uk/", match: 65, tuition: "£18,300/yr", acceptanceRate: "85%", difficulty: "Easy", ranking: 600, city: "Coventry", hostel: "Average", campus: "Urban" },
  { name: "University of Hertfordshire", country: "UK", program: "Computer Science", degree: "BS", stream: "Computer Science", deadline: "Jul 15, 2026", scholarshipUrl: "https://www.herts.ac.uk/", match: 62, tuition: "£15,500/yr", acceptanceRate: "88%", difficulty: "Easy", ranking: 800, city: "Hatfield", hostel: "Average", campus: "Modern" },

  // ============ CANADA ============
  { name: "University of Toronto", country: "Canada", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jan 15, 2026", scholarshipUrl: "https://future.utoronto.ca/", match: 85, tuition: "CAD $57,020/yr", acceptanceRate: "43%", difficulty: "Moderate", ranking: 18, city: "Toronto", hostel: "Good", campus: "Urban" },
  { name: "University of Waterloo", country: "Canada", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Feb 1, 2026", scholarshipUrl: "https://uwaterloo.ca/", match: 83, tuition: "CAD $52,000/yr", acceptanceRate: "52%", difficulty: "Moderate", ranking: 112, city: "Waterloo", hostel: "Good", campus: "Modern" },
  { name: "University of British Columbia", country: "Canada", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jan 15, 2026", scholarshipUrl: "https://www.ubc.ca/", match: 81, tuition: "CAD $44,091/yr", acceptanceRate: "46%", difficulty: "Moderate", ranking: 35, city: "Vancouver", hostel: "Good", campus: "Sprawling" },
  { name: "Concordia University", country: "Canada", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Mar 1, 2026", scholarshipUrl: "https://www.concordia.ca/", match: 70, tuition: "CAD $30,000/yr", acceptanceRate: "78%", difficulty: "Easy", ranking: 450, city: "Montreal", hostel: "Limited", campus: "Urban" },
  { name: "Cape Breton University", country: "Canada", program: "Business", degree: "BBA", stream: "General", deadline: "Aug 1, 2026", scholarshipUrl: "https://www.cbu.ca/", match: 60, tuition: "CAD $20,000/yr", acceptanceRate: "92%", difficulty: "Easy", ranking: 1500, city: "Sydney NS", hostel: "Average", campus: "Compact" },

  // ============ GERMANY ============
  { name: "TU Munich", country: "Germany", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Jan 15, 2026", scholarshipUrl: "https://www.tum.de/", match: 82, tuition: "€146/semester", acceptanceRate: "8%", difficulty: "Hard", ranking: 30, city: "Munich", hostel: "Good", campus: "Urban" },
  { name: "RWTH Aachen", country: "Germany", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Mar 1, 2026", scholarshipUrl: "https://www.rwth-aachen.de/", match: 79, tuition: "€300/semester", acceptanceRate: "30%", difficulty: "Moderate", ranking: 87, city: "Aachen", hostel: "Good", campus: "Urban" },
  { name: "TU Berlin", country: "Germany", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Jul 15, 2026", scholarshipUrl: "https://www.tu.berlin/", match: 75, tuition: "€315/semester", acceptanceRate: "55%", difficulty: "Moderate", ranking: 154, city: "Berlin", hostel: "Average", campus: "Urban" },

  // ============ AUSTRALIA / SINGAPORE / JAPAN / SWITZERLAND ============
  { name: "ETH Zurich", country: "Switzerland", program: "Engineering", degree: "MS", stream: "Computer Science", deadline: "Dec 15, 2025", scholarshipUrl: "https://ethz.ch/", match: 89, tuition: "CHF 1,460/yr", acceptanceRate: "27%", difficulty: "Hard", ranking: 7, city: "Zurich", hostel: "Limited", campus: "Urban" },
  { name: "NUS", country: "Singapore", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Nov 30, 2025", scholarshipUrl: "https://www.nus.edu.sg/", match: 85, tuition: "SGD $37,550/yr", acceptanceRate: "25%", difficulty: "Hard", ranking: 8, city: "Singapore", hostel: "Excellent", campus: "Modern" },
  { name: "NTU Singapore", country: "Singapore", program: "Engineering", degree: "BTech", stream: "Computer Science", deadline: "Mar 19, 2026", scholarshipUrl: "https://www.ntu.edu.sg/", match: 84, tuition: "SGD $36,650/yr", acceptanceRate: "30%", difficulty: "Hard", ranking: 15, city: "Singapore", hostel: "Excellent", campus: "Modern" },
  { name: "University of Melbourne", country: "Australia", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Oct 31, 2025", scholarshipUrl: "https://scholarships.unimelb.edu.au/", match: 80, tuition: "AUD $46,000/yr", acceptanceRate: "35%", difficulty: "Moderate", ranking: 14, city: "Melbourne", hostel: "Good", campus: "Urban" },
  { name: "University of Sydney", country: "Australia", program: "Business", degree: "BBA", stream: "Finance", deadline: "Nov 15, 2025", scholarshipUrl: "https://www.sydney.edu.au/", match: 78, tuition: "AUD $48,500/yr", acceptanceRate: "30%", difficulty: "Moderate", ranking: 19, city: "Sydney", hostel: "Good", campus: "Urban" },
  { name: "Monash University", country: "Australia", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Nov 30, 2025", scholarshipUrl: "https://www.monash.edu/", match: 76, tuition: "AUD $45,000/yr", acceptanceRate: "40%", difficulty: "Moderate", ranking: 42, city: "Melbourne", hostel: "Good", campus: "Sprawling" },
  { name: "Western Sydney University", country: "Australia", program: "Business", degree: "BBA", stream: "General", deadline: "Feb 1, 2026", scholarshipUrl: "https://www.westernsydney.edu.au/", match: 65, tuition: "AUD $32,000/yr", acceptanceRate: "85%", difficulty: "Easy", ranking: 380, city: "Sydney", hostel: "Average", campus: "Modern" },
  { name: "University of Tokyo", country: "Japan", program: "Engineering", degree: "BTech", stream: "Mechanical", deadline: "Dec 1, 2025", scholarshipUrl: "https://www.u-tokyo.ac.jp/en/", match: 78, tuition: "¥535,800/yr", acceptanceRate: "34%", difficulty: "Hard", ranking: 28, city: "Tokyo", hostel: "Good", campus: "Urban" },
];
