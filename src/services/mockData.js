// Mock data to use when the NYT API is not available or rate limited
export const mockArticles = [
  {
    id: 'mock-article-1',
    title: 'President Announces New Climate Initiative',
    abstract: 'The White House unveiled a sweeping new climate plan aimed at reducing carbon emissions by 50% before 2030, marking a significant shift in environmental policy.',
    byline: 'By Michael Johnson',
    published_date: '2025-04-15T10:30:00Z',
    section: 'Politics',
    multimedia: [
      {
        url: 'https://images.unsplash.com/photo-1546624244-92d41022cb4f?q=80&w=800',
        type: 'image',
        caption: 'The White House press briefing where the climate initiative was announced.'
      }
    ],
    content: '<p>WASHINGTON — President Johnson announced on Tuesday a sweeping new climate initiative that aims to cut U.S. carbon emissions in half by 2030, a plan that environmental experts are calling "ambitious but necessary."</p><p>The $2 trillion package includes significant investments in renewable energy infrastructure, electric vehicle manufacturing, and new standards for power plants.</p><p>"We face an existential threat, and we need to act now," said President Johnson during the White House press briefing. "This is not just about protecting our environment but securing our economic future."</p><p>The plan has drawn immediate praise from environmental groups but faces criticism from oil and gas industry representatives who argue that the timeline is unrealistic and could result in job losses.</p>'
  },
  {
    id: 'mock-article-2',
    title: 'Tech Giants Face New Antitrust Regulation',
    abstract: 'Congress passed new legislation aimed at breaking up monopolies in the technology sector, potentially affecting major companies like TechCorp and GlobalSoft.',
    byline: 'By Sarah Chen',
    published_date: '2025-04-14T15:45:00Z',
    section: 'Technology',
    multimedia: [
      {
        url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800',
        type: 'image',
        caption: 'The Capitol building where lawmakers voted on the new antitrust legislation.'
      }
    ],
    content: '<p>WASHINGTON — In a rare showing of bipartisan agreement, Congress passed sweeping new antitrust legislation on Monday that could fundamentally change how technology companies operate in the United States.</p><p>The "Digital Markets Competition Act" gives regulators new tools to prevent tech giants from favoring their own products and services, and could potentially lead to breaking up companies that are deemed too dominant.</p><p>"This legislation ensures that our digital economy remains competitive and innovative," said Senator Patricia Williams, the bill\'s lead sponsor.</p><p>Tech industry leaders have expressed concerns, with TechCorp CEO Alex Rivera stating that "this could hamper American innovation at a critical time in our global technological competition."</p>'
  },
  {
    id: 'mock-article-3',
    title: 'Medical Breakthrough: New Cancer Treatment Shows Promise',
    abstract: 'Researchers at University Medical Center have developed a novel treatment that targets cancer cells with unprecedented precision, showing a 70% success rate in early trials.',
    byline: 'By Dr. Robert Kim',
    published_date: '2025-04-13T08:20:00Z',
    section: 'Health',
    multimedia: [
      {
        url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80&w=800',
        type: 'image',
        caption: 'Laboratory researchers examining cell samples at University Medical Center.'
      }
    ],
    content: '<p>A groundbreaking cancer treatment developed by researchers at University Medical Center is showing remarkable promise in early clinical trials, with a 70% success rate in patients with previously untreatable forms of the disease.</p><p>The treatment, called "Precision T-Cell Therapy," uses genetically modified immune cells that are programmed to identify and attack specific cancer markers with unprecedented accuracy.</p><p>"What makes this approach revolutionary is its ability to distinguish between healthy and cancerous cells with almost perfect precision," explained Dr. Maria Santos, lead researcher on the project. "This significantly reduces the side effects typically associated with traditional cancer treatments."</p><p>The FDA has granted the treatment "breakthrough therapy" designation, which will accelerate its review process.</p>'
  },
  {
    id: 'mock-article-4',
    title: 'Economic Report Shows Strong Job Growth',
    abstract: 'The latest economic data indicates robust job growth across multiple sectors, with unemployment falling to a historic low of 3.1%.',
    byline: 'By Thomas Wilson',
    published_date: '2025-04-12T14:10:00Z',
    section: 'Business',
    multimedia: [
      {
        url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800',
        type: 'image',
        caption: 'Workers at a manufacturing plant that has recently expanded its workforce.'
      }
    ],
    content: '<p>The U.S. economy added 320,000 jobs last month, substantially exceeding economists\' forecasts and driving the unemployment rate down to 3.1%, according to data released Friday by the Labor Department.</p><p>This represents the lowest unemployment rate in over 50 years and marks the 15th consecutive month of job growth above 200,000.</p><p>"The labor market continues to demonstrate remarkable resilience," said Treasury Secretary Jennifer Adams. "We\'re seeing growth across multiple sectors, including manufacturing, healthcare, and technology."</p><p>Wages also rose by 4.2% compared to the same period last year, outpacing inflation, which has moderated to 2.3%.</p>'
  },
  {
    id: 'mock-article-5',
    title: 'SpaceX Successfully Launches First Lunar Habitat Module',
    abstract: 'SpaceX\'s Starship rocket delivered the first habitation module to lunar orbit, a critical milestone in NASA\'s Artemis program to establish a permanent Moon base.',
    byline: 'By James Rodriguez',
    published_date: '2025-04-11T19:30:00Z',
    section: 'Science',
    multimedia: [
      {
        url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800',
        type: 'image',
        caption: 'The SpaceX Starship launching from Kennedy Space Center.'
      }
    ],
    content: '<p>CAPE CANAVERAL, Fla. — SpaceX successfully launched the first lunar habitation module on Thursday, marking a significant milestone in NASA\'s Artemis program aimed at establishing a sustainable human presence on the Moon.</p><p>The Lunar Gateway Habitation Module was carried into orbit by SpaceX\'s Starship rocket, which has now completed its tenth successful flight. The module will orbit the Moon and serve as living quarters for astronauts traveling between Earth and the lunar surface.</p><p>"Today\'s launch brings us one step closer to having humans live and work on another celestial body," said NASA Administrator Lisa Martinez. "This is not just a triumph for America but for all of humanity."</p><p>The first crewed mission to the lunar Gateway is scheduled for early 2026, with the first Moon landing of the Artemis program planned for later that year.</p>'
  }
];

// Additional mock data for future use
export const mockCategories = [
  { id: 'politics', name: 'Politics', articleCount: 42 },
  { id: 'business', name: 'Business', articleCount: 38 },
  { id: 'technology', name: 'Technology', articleCount: 31 },
  { id: 'health', name: 'Health', articleCount: 25 },
  { id: 'science', name: 'Science', articleCount: 19 },
  { id: 'sports', name: 'Sports', articleCount: 27 },
  { id: 'entertainment', name: 'Entertainment', articleCount: 23 }
];