import { db } from "./db";
import {
  schools,
  opportunities,
  filterOptions,
  newsPosts,
  users,
} from "@shared/schema";
import { and, eq, or } from "drizzle-orm";
import { number } from "zod";

async function seedDatabase() {
  try {
    console.log("Starting database seeding...");

    // Check if schools table already has data
    const existingSchools = await db.select().from(schools);

    if (existingSchools.length === 0) {
      console.log("Seeding schools...");
      // Insert initial schools
      await db.insert(schools).values([
        {
          name: "Royal Collage",
          description: "A leading high school focused on STEM education",
          logoUrl: null,
        },
        {
          name: "West Valley College",
          description: "Community college with excellent transfer programs",
          logoUrl: null,
        },
        {
          name: "East River University",
          description: "Private university with strong liberal arts programs",
          logoUrl: null,
        },
      ]);
      console.log("Schools seeded successfully");
    } else {
      console.log(
        `Schools table already has ${existingSchools.length} records. Skipping seeding.`,
      );
    }

    // Get admin or teacher user to use as creator ID for seed data
    const adminUsers = await db
      .select()
      .from(users)
      .where(
        and(
          or(
            eq(users.roleId, 2), // teacher
            eq(users.roleId, 4), // admin
            eq(users.roleId, 5), // superadmin
          ),
          eq(users.isActive, true),
        ),
      );

    if (adminUsers.length === 0) {
      console.log(
        "No admin/teacher users found. Cannot seed data that requires creator IDs.",
      );
      console.log("Please create at least one admin or teacher user first.");
      return;
    }

    // Use the first admin/teacher user as creator
    const creatorId = adminUsers[0].id;
    console.log(`Using user ID ${creatorId} as creator for seed data`);

    // Seed filter options for the opportunity form
    const existingFilterOptions = await db.select().from(filterOptions);

    if (existingFilterOptions.length === 0) {
      console.log("Seeding filter options...");

      // Seed age group filter options
      await db.insert(filterOptions).values([
        {
          category: "ageGroup",
          value: "14-15",
          label: "14-15 years",
          createdById: creatorId,
        },
        {
          category: "ageGroup",
          value: "16-18",
          label: "16-18 years",
          createdById: creatorId,
        },
        {
          category: "ageGroup",
          value: "19-21",
          label: "19-21 years",
          createdById: creatorId,
        },
        {
          category: "ageGroup",
          value: "22-24",
          label: "22-24 years",
          createdById: creatorId,
        },
        {
          category: "ageGroup",
          value: "25+",
          label: "25+ years",
          createdById: creatorId,
        },
      ]);

      // Seed industry filter options
      await db.insert(filterOptions).values([
        {
          category: "industry",
          value: "technology",
          label: "Technology",
          createdById: creatorId,
        },
        {
          category: "industry",
          value: "healthcare",
          label: "Healthcare",
          createdById: creatorId,
        },
        {
          category: "industry",
          value: "finance",
          label: "Finance",
          createdById: creatorId,
        },
        {
          category: "industry",
          value: "education",
          label: "Education",
          createdById: creatorId,
        },
        {
          category: "industry",
          value: "engineering",
          label: "Engineering",
          createdById: creatorId,
        },
        {
          category: "industry",
          value: "arts",
          label: "Arts & Entertainment",
          createdById: creatorId,
        },
        {
          category: "industry",
          value: "nonprofit",
          label: "Non-profit",
          createdById: creatorId,
        },
        {
          category: "industry",
          value: "government",
          label: "Government",
          createdById: creatorId,
        },
      ]);

      // Seed opportunity type filter options
      await db.insert(filterOptions).values([
        {
          category: "opportunityType",
          value: "internship",
          label: "Internship",
          createdById: creatorId,
        },
        {
          category: "opportunityType",
          value: "job",
          label: "Job",
          createdById: creatorId,
        },
        {
          category: "opportunityType",
          value: "volunteer",
          label: "Volunteer",
          createdById: creatorId,
        },
        {
          category: "opportunityType",
          value: "workshop",
          label: "Workshop",
          createdById: creatorId,
        },
        {
          category: "opportunityType",
          value: "course",
          label: "Course",
          createdById: creatorId,
        },
        {
          category: "opportunityType",
          value: "scholarship",
          label: "Scholarship",
          createdById: creatorId,
        },
      ]);

      // Seed ethnicity filter options - UK 2021 Census ethnic groups
      await db.insert(filterOptions).values([
        {
          category: "ethnicity",
          value: "all",
          label: "All Ethnicities",
          createdById: creatorId,
        },
        // White
        {
          category: "ethnicity",
          value: "white_english",
          label: "White: English, Welsh, Scottish, Northern Irish or British",
          createdById: creatorId,
        },
        {
          category: "ethnicity",
          value: "white_irish",
          label: "White: Irish",
          createdById: creatorId,
        },
        {
          category: "ethnicity",
          value: "white_gypsy",
          label: "White: Gypsy or Irish Traveller",
          createdById: creatorId,
        },
        {
          category: "ethnicity",
          value: "white_roma",
          label: "White: Roma",
          createdById: creatorId,
        },
        {
          category: "ethnicity",
          value: "white_other",
          label: "White: Any other White background",
          createdById: creatorId,
        },
        // Mixed or Multiple ethnic groups
        {
          category: "ethnicity",
          value: "mixed_white_caribbean",
          label: "Mixed: White and Black Caribbean",
          createdById: creatorId,
        },
        {
          category: "ethnicity",
          value: "mixed_white_african",
          label: "Mixed: White and Black African",
          createdById: creatorId,
        },
        {
          category: "ethnicity",
          value: "mixed_white_asian",
          label: "Mixed: White and Asian",
          createdById: creatorId,
        },
        {
          category: "ethnicity",
          value: "mixed_other",
          label: "Mixed: Any other Mixed or Multiple ethnic background",
          createdById: creatorId,
        },
        // Asian or Asian British
        {
          category: "ethnicity",
          value: "asian_indian",
          label: "Asian: Indian",
          createdById: creatorId,
        },
        {
          category: "ethnicity",
          value: "asian_pakistani",
          label: "Asian: Pakistani",
          createdById: creatorId,
        },
        {
          category: "ethnicity",
          value: "asian_bangladeshi",
          label: "Asian: Bangladeshi",
          createdById: creatorId,
        },
        {
          category: "ethnicity",
          value: "asian_chinese",
          label: "Asian: Chinese",
          createdById: creatorId,
        },
        {
          category: "ethnicity",
          value: "asian_other",
          label: "Asian: Any other Asian background",
          createdById: creatorId,
        },
        // Black, Black British, Caribbean or African
        {
          category: "ethnicity",
          value: "black_african",
          label: "Black: African",
          createdById: creatorId,
        },
        {
          category: "ethnicity",
          value: "black_caribbean",
          label: "Black: Caribbean",
          createdById: creatorId,
        },
        {
          category: "ethnicity",
          value: "black_other",
          label:
            "Black: Any other Black, Black British, or Caribbean background",
          createdById: creatorId,
        },
        // Other ethnic group
        {
          category: "ethnicity",
          value: "other_arab",
          label: "Other: Arab",
          createdById: creatorId,
        },
        {
          category: "ethnicity",
          value: "other_any",
          label: "Other: Any other ethnic group",
          createdById: creatorId,
        },
      ]);

      // Seed gender filter options
      await db.insert(filterOptions).values([
        {
          category: "gender",
          value: "all",
          label: "All Genders",
          createdById: creatorId,
        },
        {
          category: "gender",
          value: "women",
          label: "Women",
          createdById: creatorId,
        },
        {
          category: "gender",
          value: "men",
          label: "Men",
          createdById: creatorId,
        },
        {
          category: "gender",
          value: "nonbinary",
          label: "Non-binary",
          createdById: creatorId,
        },
      ]);

      console.log("Filter options seeded successfully");
    } else {
      console.log(
        `Filter options table already has ${existingFilterOptions.length} records. Skipping seeding.`,
      );
    }

    // Refresh opportunities with updated data
    // console.log("Refreshing opportunities with updated data...");
    //await db.delete(opportunities);

    // Create fresh opportunities
    // console.log("Seeding opportunities...");

    // Create 10 opportunities with different values
    const opportunitiesData = [
      {
        title: "Software Engineering Internship",
        organization: "TechCorp Inc.",
        description:
          "Gain hands-on experience in software development with our engineering team.",
        details:
          "This internship will expose students to modern software development practices including Agile methodologies, test-driven development, and continuous integration.",
        requirements:
          "Currently pursuing a degree in Computer Science or related field. Knowledge of at least one programming language.",
        applicationProcess:
          "Submit resume and cover letter via our online portal.",
        startDate: new Date(2025, 5, 1), // June 1, 2025
        endDate: new Date(2025, 7, 31), // August 31, 2025
        applicationDeadline: new Date(2025, 3, 15), // April 15, 2025
        location: "San Francisco, CA",
        isVirtual: false,
        opportunityType: "internship",
        compensation: "$25/hour",
        industry: "technology",
        ageGroup: ["19-21"],
        contactPerson: "Jane Smith",
        contactEmail: "recruiting@techcorp.example",
        externalUrl: "https://techcorp.example/careers",
        numberOfSpaces: 5,
        createdById: creatorId,
        schoolId: 1,
        isGlobal: false,
        visibleToSchools: [1, 2],
      },
      {
        title: "Virtual Coding Workshop Series",
        organization: "Code Academy",
        description:
          "Learn to code from industry professionals in this 8-week online workshop.",
        details:
          "Each week covers different programming concepts with real-world applications and projects.",
        requirements:
          "No prior coding experience required. Must have access to a computer and internet.",
        applicationProcess: "Register online. Limited to 30 participants.",
        startDate: new Date(2025, 4, 10), // May 10, 2025
        endDate: new Date(2025, 6, 5), // July 5, 2025
        applicationDeadline: new Date(2025, 4, 1), // May 1, 2025
        location: "Online",
        isVirtual: true,
        opportunityType: "workshop",
        compensation: "Free",
        industry: "technology",
        ageGroup: ["16-18"],
        contactPerson: "Michael Johnson",
        contactEmail: "workshops@codeacademy.example",
        externalUrl: "https://codeacademy.example/workshops",
        numberOfSpaces: 30,
        createdById: creatorId,
        schoolId: 2,
        isGlobal: true,
        visibleToSchools: [1, 2, 3],
      },
      {
        title: "Healthcare Volunteer Program",
        organization: "Community Hospital",
        description:
          "Volunteer in various hospital departments to gain healthcare experience.",
        details:
          "Volunteers will rotate through different departments including emergency, pediatrics, and geriatrics.",
        requirements:
          "Must be 16+ years old. TB test and background check required.",
        applicationProcess:
          "Complete application and attend orientation session.",
        startDate: new Date(2025, 5, 15), // June 15, 2025
        endDate: new Date(2025, 8, 15), // September 15, 2025
        applicationDeadline: new Date(2025, 5, 1), // June 1, 2025
        location: "Los Angeles, CA",
        isVirtual: false,
        opportunityType: "volunteer",
        compensation: "None",
        industry: "healthcare",
        ageGroup: ["16-18"],
        ethnicityFocus: "all",
        genderFocus: "all",
        contactPerson: "Dr. Sarah Wilson",
        contactEmail: "volunteer@communityhospital.example",
        externalUrl: "https://communityhospital.example/volunteer",
        numberOfSpaces: 10,
        createdById: creatorId,
        schoolId: 3,
        isGlobal: false,
        visibleToSchools: [3],
      },
      {
        title: "Financial Literacy Workshop",
        organization: "First National Bank",
        description:
          "Learn essential financial skills including budgeting, saving, and investing.",
        details:
          "This one-day workshop covers personal finance fundamentals for young adults.",
        requirements: "Open to all high school students.",
        applicationProcess: "Register through your school's career center.",
        startDate: new Date(2025, 4, 20), // May 20, 2025
        endDate: new Date(2025, 4, 20), // May 20, 2025
        applicationDeadline: new Date(2025, 4, 15), // May 15, 2025
        location: "New York, NY",
        isVirtual: false,
        opportunityType: "workshop",
        compensation: "Free",
        industry: "finance",
        ageGroup: ["16-18"],
        contactPerson: "Robert Chen",
        contactEmail: "education@fnb.example",
        externalUrl: "https://fnb.example/education",
        numberOfSpaces: 50,
        createdById: creatorId,
        schoolId: 1,
        isGlobal: false,
        visibleToSchools: [1],
      },
      {
        title: "Summer Environmental Research Program",
        organization: "GreenEarth Foundation",
        description:
          "Participate in environmental research projects focused on local ecosystems.",
        details:
          "Students will collect field data, analyze samples, and contribute to ongoing research.",
        requirements:
          "Interest in environmental science. Biology or chemistry coursework preferred.",
        applicationProcess:
          "Submit application with essay about environmental interests.",
        startDate: new Date(2025, 6, 1), // July 1, 2025
        endDate: new Date(2025, 7, 31), // August 31, 2025
        applicationDeadline: new Date(2025, 4, 30), // May 30, 2025
        location: "Portland, OR",
        isVirtual: false,
        opportunityType: "internship",
        compensation: "$20/hour",
        industry: "nonprofits",
        ageGroup: ["19-21"],
        contactPerson: "Dr. Maya Patel",
        contactEmail: "research@greenearth.example",
        externalUrl: "https://greenearth.example/research",
        numberOfSpaces: 8,
        createdById: creatorId,
        schoolId: 2,
        isGlobal: false,
        visibleToSchools: [2],
      },
      {
        title: "Women in Engineering Conference",
        organization: "Engineering Society",
        description:
          "Annual conference featuring workshops, speakers, and networking for women in engineering.",
        details:
          "This two-day conference includes panel discussions, hands-on activities, and career fair.",
        requirements:
          "Open to female high school and college students interested in engineering fields.",
        applicationProcess: "Apply online with brief statement of interest.",
        startDate: new Date(2025, 10, 15), // November 15, 2025
        endDate: new Date(2025, 10, 16), // November 16, 2025
        applicationDeadline: new Date(2025, 9, 30), // October 30, 2025
        location: "Chicago, IL",
        isVirtual: false,
        opportunityType: "workshop",
        compensation: "Free",
        industry: "engineering",
        ageGroup: ["16-18"],
        genderFocus: "women",
        contactPerson: "Elizabeth Taylor",
        contactEmail: "conference@engineeringsociety.example",
        externalUrl: "https://engineeringsociety.example/women-conference",
        numberOfSpaces: 100,
        createdById: creatorId,
        schoolId: 3,
        isGlobal: true,
        visibleToSchools: [1, 2, 3],
      },
      {
        title: "Government Internship Program",
        organization: "City Hall",
        description:
          "Work alongside local government officials to learn about public service.",
        details:
          "Interns will rotate through different departments including mayor's office, planning, and public works.",
        requirements:
          "Must be 18+ years old and have an interest in government or public policy.",
        applicationProcess:
          "Submit application with resume and letter of recommendation.",
        startDate: new Date(2025, 8, 15), // September 15, 2025
        endDate: new Date(2025, 11, 15), // December 15, 2025
        applicationDeadline: new Date(2025, 7, 15), // August 15, 2025
        location: "Seattle, WA",
        isVirtual: false,
        opportunityType: "internship",
        compensation: "$18/hour",
        industry: "government",
        ageGroup: ["19-21"],
        contactPerson: "James Williams",
        contactEmail: "internships@cityhall.example",
        externalUrl: "https://cityhall.example/internships",
        numberOfSpaces: 6,
        createdById: creatorId,
        schoolId: 1,
        isGlobal: false,
        visibleToSchools: [1],
      },
      {
        title: "Digital Marketing Bootcamp",
        organization: "Marketing Masters",
        description:
          "Intensive two-week program covering social media, SEO, content marketing, and analytics.",
        details:
          "Learn practical digital marketing skills that can be immediately applied in the workplace.",
        requirements:
          "Basic computer skills required. Marketing experience not necessary.",
        applicationProcess:
          "Apply with brief statement about marketing interests.",
        startDate: new Date(2025, 6, 7), // July 7, 2025
        endDate: new Date(2025, 6, 18), // July 18, 2025
        applicationDeadline: new Date(2025, 6, 1), // July 1, 2025
        location: "Online",
        isVirtual: true,
        opportunityType: "course",
        compensation: "$250 tuition",
        industry: "technology",
        ageGroup: ["19-21"],
        contactPerson: "Sophia Garcia",
        contactEmail: "info@marketingmasters.example",
        externalUrl: "https://marketingmasters.example/bootcamp",
        numberOfSpaces: 20,
        createdById: creatorId,
        schoolId: 2,
        isGlobal: false,
        visibleToSchools: [2],
      },
      {
        title: "Youth Arts Mentorship",
        organization: "Community Arts Center",
        description:
          "Mentorship program pairing students with professional artists in various disciplines.",
        details:
          "Mentees will develop portfolios, attend workshops, and present work at year-end exhibition.",
        requirements:
          "Must submit work samples demonstrating interest and basic skills in chosen art form.",
        applicationProcess: "Application with portfolio review and interview.",
        startDate: new Date(2025, 8, 1), // September 1, 2025
        endDate: new Date(2026, 4, 30), // May 30, 2026
        applicationDeadline: new Date(2025, 7, 15), // August 15, 2025
        location: "Boston, MA",
        isVirtual: false,
        opportunityType: "volunteer",
        compensation: "None",
        industry: "arts",
        ageGroup: ["14-15"],
        contactPerson: "David Kim",
        contactEmail: "mentorship@communityarts.example",
        externalUrl: "https://communityarts.example/mentorship",
        numberOfSpaces: 15,
        createdById: creatorId,
        schoolId: 3,
        isGlobal: false,
        visibleToSchools: [3],
      },
      {
        title: "STEM Scholarship Program",
        organization: "Future Scientists Foundation",
        description:
          "Scholarship for underrepresented students pursuing STEM education.",
        details:
          "Awards $5,000 scholarships to students demonstrating academic excellence and financial need.",
        requirements:
          "GPA of 3.5+ in STEM courses. Must be planning to major in STEM field.",
        applicationProcess:
          "Application with transcripts, essays, and recommendation letters.",
        startDate: new Date(2025, 9, 1), // October 1, 2025
        endDate: new Date(2025, 11, 15), // December 15, 2025
        applicationDeadline: new Date(2025, 10, 31), // November 31, 2025
        location: "National",
        isVirtual: true,
        opportunityType: "scholarship",
        compensation: "$5,000",
        industry: "education",
        ageGroup: ["16-18"],
        ethnicityFocus: "hispanic",
        contactPerson: "Dr. Thomas Rodriguez",
        contactEmail: "scholarships@futurescientists.example",
        externalUrl: "https://futurescientists.example/scholarships",
        numberOfSpaces: 10,
        createdById: creatorId,
        schoolId: 1,
        isGlobal: true,
        visibleToSchools: [1, 2, 3],
      },
    ];

    // await db.insert(opportunities).values(opportunitiesData);
    // console.log("Opportunities seeded successfully");

    // Seed news posts
    const existingNewsPosts = await db.select().from(newsPosts);

    if (existingNewsPosts.length === 0) {
      console.log("Seeding news posts...");

      // Use the same creator ID for author_id
      const authorId = creatorId;

      // Create 10 news posts
      const newsPostsData = [
        {
          title: "New Career Exploration Website Launched",
          content:
            "We're excited to announce the launch of our new career exploration platform! This website provides resources, assessments, and information about various career paths. Check it out at careers.example.org.",
          authorId: authorId,
          schoolId: 1,
          isGlobal: true,
          imageUrl:
            "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
          likes: 15,
        },
        {
          title: "Upcoming Tech Career Fair",
          content:
            "Mark your calendars! Our annual Technology Career Fair will be held next month featuring representatives from top tech companies. This is a great opportunity to network and learn about internships and entry-level positions. Visit the career center for more details and to register.",
          authorId: authorId,
          schoolId: 2,
          isGlobal: false,
          imageUrl:
            "https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
          likes: 23,
        },
        {
          title: "Summer Internship Application Deadlines Approaching",
          content:
            "A reminder to all students that many summer internship application deadlines are coming up in the next few weeks. Check out our opportunities page for a complete list of available positions. Don't wait until the last minute to apply!",
          authorId: authorId,
          schoolId: 3,
          isGlobal: false,
          imageUrl:
            "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
          likes: 42,
        },
        {
          title: "Watch: TikTok Series on 'Jobs of the Future'",
          content:
            "Check out this informative TikTok series exploring emerging careers in technology, sustainability, and healthcare. Great insights into how AI and automation are creating new job opportunities: https://tiktok.com/@futurecareers",
          authorId: authorId,
          schoolId: 1,
          isGlobal: true,
          imageUrl:
            "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
          likes: 89,
        },
        {
          title: "Workshop: Building Your LinkedIn Profile",
          content:
            "Join us next week for a hands-on workshop on creating an effective LinkedIn profile. Learn how to highlight your skills, connect with professionals, and use the platform for job searching. Space is limited, so register early!",
          authorId: authorId,
          schoolId: 2,
          isGlobal: false,
          imageUrl:
            "https://images.unsplash.com/photo-1611944212129-29977ae1398c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
          likes: 34,
        },
        {
          title: "Congratulations to Scholarship Recipients",
          content:
            "We're proud to announce this year's recipients of the Future Leaders Scholarship. These outstanding students demonstrated exceptional academic achievement and community involvement. Visit our website to learn more about their accomplishments and future plans.",
          authorId: authorId,
          schoolId: 3,
          isGlobal: true,
          imageUrl:
            "https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
          likes: 67,
        },
        {
          title: "New Research: Top Skills Employers Are Seeking",
          content:
            "Recent research reveals that employers are increasingly valuing soft skills alongside technical abilities. Communication, problem-solving, and adaptability top the list. Read the full report on our website and learn how to develop these skills through our workshops and resources.",
          authorId: authorId,
          schoolId: 1,
          isGlobal: false,
          imageUrl:
            "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
          likes: 45,
        },
        {
          title: "Virtual Reality Career Exploration Tool Now Available",
          content:
            "Experience different careers through our new VR simulation program! Put on a headset and spend a day as a surgeon, engineer, or chef. This immersive experience helps students get a feel for various professions before making educational decisions. Schedule a session at the career center.",
          authorId: authorId,
          schoolId: 2,
          isGlobal: true,
          imageUrl:
            "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
          likes: 56,
        },
        {
          title: "Alumni Spotlight: From Student to CEO",
          content:
            "We're featuring graduate Maria Rodriguez who founded her tech startup just three years after graduation. Her journey from student projects to successful entrepreneur shows the power of persistence and networking. Watch her interview on our YouTube channel.",
          authorId: authorId,
          schoolId: 3,
          isGlobal: false,
          imageUrl:
            "https://images.unsplash.com/photo-1573497620292-4748bfb6a602?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
          likes: 78,
        },
        {
          title: "New Partnership with Tech Industry Leaders",
          content:
            "We're excited to announce a new partnership with leading tech companies to provide exclusive internship opportunities for our students. This collaboration includes mentorship programs, technical workshops, and guaranteed interview slots. More details coming soon!",
          authorId: authorId,
          schoolId: 1,
          isGlobal: true,
          imageUrl:
            "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
          likes: 92,
        },
      ];

      await db.insert(newsPosts).values(newsPostsData);
      console.log("News posts seeded successfully");
    } else {
      console.log(
        `News posts table already has ${existingNewsPosts.length} records. Skipping seeding.`,
      );
    }

    console.log("Database seeding completed");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

export { seedDatabase };
