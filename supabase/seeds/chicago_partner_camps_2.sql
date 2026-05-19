-- ─────────────────────────────────────────────────────────────────────────────
-- Chicago Partner Listings Batch 2
-- Shedd Aquarium, Chicago Botanic Garden, Old Town School of Folk Music,
-- The Chopping Block, Lillstreet Art Center, Hubbard Street Dance,
-- Chicago Rocks, Joffrey Ballet
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_host uuid;
BEGIN
  SELECT id INTO v_host FROM profiles WHERE email = 'hey@heywowzi.com' LIMIT 1;
  IF v_host IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found.';
  END IF;

  -- ── 1. Shedd Aquarium ─────────────────────────────────────────────────────
  INSERT INTO camps (
    slug, short_id, name, description, location,
    start_time, end_time,
    price_cents, listing_type, schedule_days,
    hero_image_url, image_urls,
    external_url, is_published, host_id, meta
  ) VALUES (
    'shedd-aquarium-summer-camp',
    'shd5e6f7',
    'Shedd Aquarium Summer Camp',
    E'Go behind the scenes at one of the world''s largest indoor aquariums. Shedd Aquarium''s summer camps give kids exclusive access to marine habitats, animal care facilities, and the scientists who work there every day. Campers explore ocean ecosystems, freshwater environments, and the biology of Shedd''s iconic residents — from beluga whales to Pacific white-sided dolphins.\n\nEach week focuses on a different theme, with hands-on experiments, animal encounters, and conversations with professional aquarists and researchers. Programs run for kids in grades K–8, with age-appropriate tracks across the full summer.',
    '1200 S Lake Shore Dr, Chicago, IL 60605',
    '2026-06-15', '2026-08-14',
    55000, 'camp', ARRAY['Mon','Tue','Wed','Thu','Fri'],
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80'],
    'https://www.sheddaquarium.org/education/camps',
    true, v_host,
    jsonb_build_object(
      'partnerListing', true,
      'organizationName', 'Shedd Aquarium',
      'organizationSlug', 'shedd-aquarium',
      'organizationDescription', 'The John G. Shedd Aquarium is one of the world''s largest indoor aquariums and a beloved Chicago landmark on the Museum Campus. Home to more than 32,000 animals, Shedd runs year-round education programs connecting kids to aquatic life and conservation.',
      'organizationLocation', 'Museum Campus, Chicago',
      'organizationWebsite', 'https://www.sheddaquarium.org',
      'externalUrl', 'https://www.sheddaquarium.org/education/camps',
      'dateLabel', 'Jun 15 – Aug 14',
      'price_unit', 'per week',
      'ageMin', 5,
      'ageMax', 14,
      'highlights', jsonb_build_array(
        'Behind-the-scenes access at one of the world''s great aquariums',
        'Animal encounters with marine mammals, fish, and invertebrates',
        'Work alongside professional aquarists and researchers',
        'Weekly themes from ocean ecosystems to freshwater biology',
        'Programs for grades K–8'
      )
    )
  ) ON CONFLICT (slug) DO NOTHING;

  -- ── 2. Chicago Botanic Garden ─────────────────────────────────────────────
  INSERT INTO camps (
    slug, short_id, name, description, location,
    start_time, end_time,
    price_cents, listing_type, schedule_days,
    hero_image_url, image_urls,
    external_url, is_published, host_id, meta
  ) VALUES (
    'chicago-botanic-garden-summer-camp',
    'cbg8g9h0',
    'Chicago Botanic Garden Summer Camp',
    E'385 acres of living museum, and it''s your kid''s classroom for the week. Chicago Botanic Garden''s summer camps take kids out of the building and into the landscape — exploring native plants, pollinators, garden ecosystems, and the science of how living things grow and adapt.\n\nCamps are organized by age group, with themes that rotate each week: garden science, ecology, food systems, nature art, and more. Kids get their hands in the soil, use real scientific tools, and leave with a genuine connection to the natural world. Located in Glencoe, about 25 miles north of downtown Chicago.',
    '1000 Lake Cook Rd, Glencoe, IL 60022',
    '2026-06-15', '2026-08-14',
    32500, 'camp', ARRAY['Mon','Tue','Wed','Thu','Fri'],
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80'],
    'https://www.chicagobotanic.org/camps',
    true, v_host,
    jsonb_build_object(
      'partnerListing', true,
      'organizationName', 'Chicago Botanic Garden',
      'organizationSlug', 'chicago-botanic-garden',
      'organizationDescription', 'The Chicago Botanic Garden is a 385-acre living plant museum in Glencoe, Illinois. One of the most visited public gardens in the country, the Garden runs extensive education programs for youth, families, and schools throughout the year.',
      'organizationLocation', 'Glencoe, IL',
      'organizationWebsite', 'https://www.chicagobotanic.org',
      'externalUrl', 'https://www.chicagobotanic.org/camps',
      'dateLabel', 'Jun 15 – Aug 14',
      'price_unit', 'per week',
      'ageMin', 4,
      'ageMax', 14,
      'highlights', jsonb_build_array(
        '385 acres of living landscape as your classroom',
        'Hands-on ecology, gardening, and nature science',
        'Rotating weekly themes — garden science, food systems, nature art',
        'Age-grouped programs from pre-K through middle school',
        'One of the country''s most visited public gardens'
      )
    )
  ) ON CONFLICT (slug) DO NOTHING;

  -- ── 3. Old Town School of Folk Music ─────────────────────────────────────
  INSERT INTO camps (
    slug, short_id, name, description, location,
    start_time, end_time,
    price_cents, listing_type, schedule_days,
    hero_image_url, image_urls,
    external_url, is_published, host_id, meta
  ) VALUES (
    'old-town-school-summer-camps',
    'ots1i2j3',
    'Old Town School of Folk Music Summer Camps',
    E'The Old Town School of Folk Music has been the heart of Chicago''s music community since 1957. Their summer camps bring that spirit to kids — through songwriting, world music, instrument exploration, and performance. Campers don''t just learn to play; they learn to listen, collaborate, and make music together.\n\nCamps run across multiple age groups and instrument tracks. Younger kids explore rhythm, movement, and music fundamentals. Older campers dive into specific genres — folk, rock, bluegrass, global percussion — and put together performances by the end of the week. The Old Town School is one of the largest community music schools in the country, and it shows in how they teach.',
    '4544 N Lincoln Ave, Chicago, IL 60625',
    '2026-06-08', '2026-08-14',
    42500, 'camp', ARRAY['Mon','Tue','Wed','Thu','Fri'],
    'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80'],
    'https://www.oldtownschool.org/kids/camps',
    true, v_host,
    jsonb_build_object(
      'partnerListing', true,
      'organizationName', 'Old Town School of Folk Music',
      'organizationSlug', 'old-town-school',
      'organizationDescription', 'Founded in 1957, the Old Town School of Folk Music is Chicago''s premier community music school and one of the largest in the country. Located in Lincoln Square, the school offers instruction in dozens of instruments and genres for students of all ages.',
      'organizationLocation', 'Lincoln Square, Chicago',
      'organizationWebsite', 'https://www.oldtownschool.org',
      'externalUrl', 'https://www.oldtownschool.org/kids/camps',
      'dateLabel', 'Jun 8 – Aug 14',
      'price_unit', 'per week',
      'ageMin', 4,
      'ageMax', 17,
      'highlights', jsonb_build_array(
        'Chicago''s most beloved community music school since 1957',
        'Songwriting, world music, folk, rock, and global percussion',
        'Ends with a live performance each week',
        'Programs for toddlers through teens',
        'One of the largest community music schools in the country'
      )
    )
  ) ON CONFLICT (slug) DO NOTHING;

  -- ── 4. The Chopping Block ─────────────────────────────────────────────────
  INSERT INTO camps (
    slug, short_id, name, description, location,
    start_time, end_time,
    price_cents, listing_type, schedule_days,
    hero_image_url, image_urls,
    external_url, is_published, host_id, meta
  ) VALUES (
    'chopping-block-kids-cooking-camp',
    'tcb4k5l6',
    'The Chopping Block Kids Cooking Camp',
    E'Chicago''s most respected culinary school runs cooking camps for kids — and they treat young cooks exactly the way they treat adults: with real knives, real techniques, and real food. Kids leave each session with actual skills, not just a recipe.\n\nWeek-long camps (ages 9–17) cover everything from knife skills and flavor fundamentals to international cuisines and baking science. Each day ends with a family-style meal that campers have prepared themselves. Half-day and full-day formats available at their Lincoln Square and Fulton Market locations.',
    '4747 N Lincoln Ave, Chicago, IL 60625',
    '2026-06-08', '2026-08-14',
    65000, 'camp', ARRAY['Mon','Tue','Wed','Thu','Fri'],
    'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&q=80'],
    'https://www.thechoppingblock.com/classes/kids-and-teens',
    true, v_host,
    jsonb_build_object(
      'partnerListing', true,
      'organizationName', 'The Chopping Block',
      'organizationSlug', 'chopping-block',
      'organizationDescription', 'The Chopping Block is Chicago''s premier independent culinary school, with locations in Lincoln Square and the Fulton Market. Founded in 1997, they offer hands-on cooking classes, camps, and experiences for adults, teens, and kids.',
      'organizationLocation', 'Lincoln Square & Fulton Market, Chicago',
      'organizationWebsite', 'https://www.thechoppingblock.com',
      'externalUrl', 'https://www.thechoppingblock.com/classes/kids-and-teens',
      'dateLabel', 'Jun 8 – Aug 14',
      'price_unit', 'per week',
      'ageMin', 9,
      'ageMax', 17,
      'highlights', jsonb_build_array(
        'Chicago''s most respected independent culinary school',
        'Real techniques, real knives, real food',
        'Ends each day with a family-style meal campers prepared',
        'International cuisines, baking science, knife skills, and more',
        'Locations in Lincoln Square and Fulton Market'
      )
    )
  ) ON CONFLICT (slug) DO NOTHING;

  -- ── 5. Lillstreet Art Center ──────────────────────────────────────────────
  INSERT INTO camps (
    slug, short_id, name, description, location,
    start_time, end_time,
    price_cents, listing_type, schedule_days,
    hero_image_url, image_urls,
    external_url, is_published, host_id, meta
  ) VALUES (
    'lillstreet-art-center-summer-camps',
    'lls7m8n9',
    'Handbuilding and Wheelthrowing',
    E'Explore the sculptural and functional possibilities of clay while creating your own original works of art. In this hands-on class, students will learn foundational pottery techniques such as centering clay on the wheel, rolling slabs, building forms with coils, and shaping vessels like bowls, cups, or vases.\n\nStudents will be encouraged to experiment with texture, form, and surface design as they develop a small collection of ceramic pieces. The class will also introduce glazing techniques, giving students the chance to add color, pattern, and personality to their finished pottery. Along the way, they''ll build confidence working with clay, learn how ceramic objects are made, and discover the satisfaction of turning raw material into something both beautiful and useful.',
    '4401 N Ravenswood Ave, Chicago, IL 60640',
    '2026-06-08', '2026-08-21',
    42500, 'camp', ARRAY['Mon','Tue','Wed','Thu','Fri'],
    'https://fzdhexysoleaegzwtryf.supabase.co/storage/v1/object/public/activity-images/lillstreet/wheelthrowing.jpg',
    ARRAY['https://fzdhexysoleaegzwtryf.supabase.co/storage/v1/object/public/activity-images/lillstreet/wheelthrowing.jpg'],
    'https://www.lillstreet.com/classes/youth-teens/summer-camps',
    true, v_host,
    jsonb_build_object(
      'partnerListing', true,
      'organizationName', 'Lillstreet Art Center',
      'organizationSlug', 'lillstreet',
      'organizationDescription', 'Lillstreet Art Center is a working artist community and arts education center in Chicago''s Ravenswood neighborhood. Founded in 1975, Lillstreet offers classes, camps, and studio space across ceramics, fiber, painting, printmaking, and more for all ages.',
      'organizationLocation', 'Ravenswood, Chicago',
      'organizationWebsite', 'https://www.lillstreet.com',
      'externalUrl', 'https://www.lillstreet.com/classes/youth-teens/summer-camps',
      'dateLabel', 'Jun 8 – Aug 21',
      'price_unit', 'per week',
      'ageMin', 5,
      'ageMax', 18,
      'highlights', jsonb_build_array(
        'Real studio arts in a working artist community',
        'Ceramics, wheel throwing, painting, printmaking, fiber arts, and more',
        'Taught by practicing Chicago artists',
        'Dozens of weekly tracks across the full summer',
        'Kids take home work made with professional-grade materials'
      )
    )
  ) ON CONFLICT (slug) DO NOTHING;

  -- ── 6. Hubbard Street Dance Chicago ──────────────────────────────────────
  INSERT INTO camps (
    slug, short_id, name, description, location,
    start_time, end_time,
    price_cents, listing_type, schedule_days,
    hero_image_url, image_urls,
    external_url, is_published, host_id, meta
  ) VALUES (
    'hubbard-street-dance-summer-intensive',
    'hsd0o1p2',
    'Hubbard Street Dance Summer Intensive',
    E'Train with one of the most acclaimed contemporary dance companies in the world. Hubbard Street Dance Chicago''s summer intensives give serious young dancers access to the same artistic standards and teaching philosophy that has shaped professional careers for decades.\n\nThe youth intensive (ages 10–18) covers contemporary technique, improvisation, partnering, and repertoire — taught by Hubbard Street company members and master teachers. Days are full and demanding, designed for dancers who want to push their craft. A rare opportunity to work inside a world-class company on their home stage in Chicago''s Loop.',
    '205 W Randolph St, Chicago, IL 60606',
    '2026-06-22', '2026-07-17',
    95000, 'camp', ARRAY['Mon','Tue','Wed','Thu','Fri'],
    'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800&q=80'],
    'https://www.hubbardstreetdance.com/education/youth-programs',
    true, v_host,
    jsonb_build_object(
      'partnerListing', true,
      'organizationName', 'Hubbard Street Dance Chicago',
      'organizationSlug', 'hubbard-street-dance',
      'organizationDescription', 'Hubbard Street Dance Chicago is one of the most celebrated contemporary dance companies in the world. Based in Chicago''s Loop, Hubbard Street runs extensive education programs for youth and pre-professional dancers alongside their mainstage season.',
      'organizationLocation', 'The Loop, Chicago',
      'organizationWebsite', 'https://www.hubbardstreetdance.com',
      'externalUrl', 'https://www.hubbardstreetdance.com/education/youth-programs',
      'dateLabel', 'Jun 22 – Jul 17',
      'price_unit', 'per week',
      'ageMin', 10,
      'ageMax', 18,
      'highlights', jsonb_build_array(
        'Train with one of the world''s top contemporary dance companies',
        'Taught by Hubbard Street company members and master teachers',
        'Contemporary technique, improvisation, partnering, and repertoire',
        'Full-day intensive format for serious dancers',
        'Held at Hubbard Street''s home stage in the Loop'
      )
    )
  ) ON CONFLICT (slug) DO NOTHING;

  -- ── 7. Chicago Rocks Climbing ─────────────────────────────────────────────
  INSERT INTO camps (
    slug, short_id, name, description, location,
    start_time, end_time,
    price_cents, listing_type, schedule_days,
    hero_image_url, image_urls,
    external_url, is_published, host_id, meta
  ) VALUES (
    'chicago-rocks-youth-climbing-camp',
    'crk3q4r5',
    'Chicago Rocks Youth Climbing Camp',
    E'Climbing is one of the best things you can put a kid in — it builds problem-solving, physical confidence, and focus in a way almost no other sport does. Chicago Rocks runs week-long youth climbing camps at their indoor gym, with certified instructors teaching top-rope, lead climbing fundamentals, and bouldering.\n\nCampers are grouped by age and experience level. Beginners learn movement, footwork, and safety. More experienced climbers work on technique, route reading, and setting personal challenges. Every day includes open climbing time, skill-building drills, and games that make the gym feel like an adventure.',
    '1710 N Mendell St, Chicago, IL 60642',
    '2026-06-08', '2026-08-14',
    37500, 'camp', ARRAY['Mon','Tue','Wed','Thu','Fri'],
    'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1522163182402-834f871fd851?w=800&q=80'],
    'https://www.chicagorocks.com/camps',
    true, v_host,
    jsonb_build_object(
      'partnerListing', true,
      'organizationName', 'Chicago Rocks',
      'organizationSlug', 'chicago-rocks',
      'organizationDescription', 'Chicago Rocks is an independent indoor climbing gym in Chicago''s Clybourn Corridor neighborhood. Offering climbing instruction and youth programs for all experience levels, Chicago Rocks is one of the city''s go-to destinations for youth climbing.',
      'organizationLocation', 'Clybourn Corridor, Chicago',
      'organizationWebsite', 'https://www.chicagorocks.com',
      'externalUrl', 'https://www.chicagorocks.com/camps',
      'dateLabel', 'Jun 8 – Aug 14',
      'price_unit', 'per week',
      'ageMin', 6,
      'ageMax', 16,
      'highlights', jsonb_build_array(
        'Top-rope, bouldering, and lead climbing fundamentals',
        'Certified instructors, grouped by age and experience',
        'Builds problem-solving, physical confidence, and focus',
        'Open climbing time every day alongside structured skill drills',
        'All experience levels welcome — true beginners to advanced'
      )
    )
  ) ON CONFLICT (slug) DO NOTHING;

  -- ── 8. Joffrey Ballet ─────────────────────────────────────────────────────
  INSERT INTO camps (
    slug, short_id, name, description, location,
    start_time, end_time,
    price_cents, listing_type, schedule_days,
    hero_image_url, image_urls,
    external_url, is_published, host_id, meta
  ) VALUES (
    'joffrey-ballet-summer-intensive',
    'jfr6s7t8',
    'Joffrey Ballet Summer Intensive',
    E'The Joffrey Ballet is one of America''s great ballet companies — and their Chicago summer intensive is where serious young dancers come to train at the highest level. The program brings together pre-professional dancers from across the country for intensive daily training in classical technique, contemporary work, pointe, variations, and pas de deux.\n\nThe intensive runs for multiple weeks and is open to dancers ages 10–18 by audition or application. Full-day scheduling mirrors professional company life. Faculty includes Joffrey company artists and internationally recognized guest teachers. For dancers ready to take the next step, there''s nothing quite like it in Chicago.',
    '10 E Randolph St, Chicago, IL 60601',
    '2026-06-22', '2026-07-24',
    110000, 'camp', ARRAY['Mon','Tue','Wed','Thu','Fri'],
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&q=80',
    ARRAY['https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&q=80'],
    'https://www.joffrey.org/school/summer-intensive',
    true, v_host,
    jsonb_build_object(
      'partnerListing', true,
      'organizationName', 'Joffrey Ballet',
      'organizationSlug', 'joffrey-ballet',
      'organizationDescription', 'The Joffrey Ballet is one of America''s preeminent ballet companies, based in Chicago''s Loop. Founded in 1956, the Joffrey is known for its bold artistic vision and extensive community engagement, including youth and pre-professional training programs.',
      'organizationLocation', 'The Loop, Chicago',
      'organizationWebsite', 'https://www.joffrey.org',
      'externalUrl', 'https://www.joffrey.org/school/summer-intensive',
      'dateLabel', 'Jun 22 – Jul 24',
      'price_unit', 'per week',
      'ageMin', 10,
      'ageMax', 18,
      'highlights', jsonb_build_array(
        'Train at one of America''s great ballet companies',
        'Classical technique, contemporary, pointe, variations, and pas de deux',
        'Faculty includes Joffrey company artists and international guest teachers',
        'Full-day intensive schedule mirroring professional company life',
        'Open to dancers ages 10–18 by audition or application'
      )
    )
  ) ON CONFLICT (slug) DO NOTHING;

END $$;
