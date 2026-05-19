-- ─────────────────────────────────────────────────────────────────────────────
-- Chicago Partner Listings — Chicago Children's Theatre, Lincoln Park Zoo,
-- Griffin MSI, Second City (x2)
-- Run in Supabase SQL editor. Requires the admin user to already exist in profiles.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_host uuid;
BEGIN
  SELECT id INTO v_host FROM profiles WHERE email = 'hey@heywowzi.com' LIMIT 1;
  IF v_host IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found — make sure hey@heywowzi.com has signed up first.';
  END IF;

  -- ── 1. Chicago Children's Theatre ────────────────────────────────────────
  INSERT INTO camps (
    slug, short_id, name, description, location,
    start_time, end_time,
    price_cents, listing_type, schedule_days,
    hero_image_url, image_urls,
    external_url, is_published, host_id, meta
  ) VALUES (
    'chicago-childrens-theatre-summer-camps',
    'cct1s2m3',
    'Chicago Children''s Theatre Summer Camps',
    E'At Chicago Children''s Theatre, kids don''t just watch theatre — they make it. Each week-long camp brings together young artists (ages 4–18) to collaborate with professional theatre artists and devise original plays from scratch. No experience necessary. Mornings dive into improv and storytelling; afternoons explore comedy writing, physical performance, and specialty skills like stand-up and clowning. Every session ends with a final performance campers have created themselves.\n\nCamps span the full summer with different themes each week — from musical theatre and circus arts to radio plays and Neo-Futurist devising. Before- and after-care are included at no extra charge.',
    '100 S Racine Ave, Chicago, IL 60607',
    '2026-06-08', '2026-08-21',
    58500, 'camp', ARRAY['Mon','Tue','Wed','Thu','Fri'],
    'https://chicagochildrenstheatre.org/wp-content/uploads/2022/10/Improv_In_Performance.jpg',
    ARRAY[
      'https://chicagochildrenstheatre.org/wp-content/uploads/2022/10/Improv_In_Performance.jpg',
      'https://chicagochildrenstheatre.org/wp-content/uploads/2022/10/Acting_Adventures_2.jpg',
      'https://chicagochildrenstheatre.org/wp-content/uploads/2021/07/Acting_Adventures_3.jpg',
      'https://chicagochildrenstheatre.org/wp-content/uploads/2022/10/Tumbling_.jpg'
    ],
    'https://www.chicagochildrenstheatre.org/camps',
    true, v_host,
    jsonb_build_object(
      'partnerListing', true,
      'organizationName', 'Chicago Children''s Theatre',
      'organizationSlug', 'chicago-childrens-theatre',
      'organizationDescription', 'Chicago Children''s Theatre is a nationally recognized company dedicated to creating world-class theatre for young audiences. Located in the West Loop, CCT runs year-round education programs and produces bold, professional productions for kids and families.',
      'organizationLocation', 'West Loop, Chicago',
      'organizationWebsite', 'https://www.chicagochildrenstheatre.org',
      'externalUrl', 'https://www.chicagochildrenstheatre.org/camps',
      'dateLabel', 'Jun 8 – Aug 21',
      'price_unit', 'per week',
      'ageMin', 4,
      'ageMax', 18,
      'highlights', jsonb_build_array(
        'Devise and perform an original play every week',
        'Led by professional Chicago theatre artists',
        'Improv, comedy writing, musical theatre, circus arts, and more',
        'Before- and after-care included at no extra charge',
        'Financial assistance available'
      )
    )
  ) ON CONFLICT (slug) DO NOTHING;

  -- ── 2. Lincoln Park Zoo — Conservation Camp ───────────────────────────────
  INSERT INTO camps (
    slug, short_id, name, description, location,
    start_time, end_time,
    price_cents, listing_type, schedule_days,
    hero_image_url, image_urls,
    external_url, is_published, host_id, meta
  ) VALUES (
    'lincoln-park-zoo-conservation-camp',
    'lpz4w5x6',
    'Lincoln Park Zoo Conservation Camp',
    E'Spend a week adventuring through one of Chicago''s most iconic destinations. Lincoln Park Zoo''s Conservation Camp drops kids (PreK–Grade 5) into the heart of the zoo with weekly themes designed to spark curiosity about wildlife and conservation. Campers spend their days exploring exhibits, learning from professional zookeepers, and doing hands-on activities outdoors — all without ever touching the animals directly.\n\nEach week has a different theme: Wild Work, Critter Classification, Mystery Zoo, Exploration Safari, and Built for the Wild. An Inclusion Specialist is on-site every day to support campers with diverse needs. Aftercare (3–5 p.m.) and lunches are available as add-ons.',
    '2001 N Clark St, Chicago, IL 60614',
    '2026-06-08', '2026-08-14',
    64700, 'camp', ARRAY['Mon','Tue','Wed','Thu','Fri'],
    'https://www.lpzoo.org/wp-content/uploads/2026/01/Camp-2026-header-v2.jpg',
    ARRAY[
      'https://www.lpzoo.org/wp-content/uploads/2026/01/Camp-2026-header-v2.jpg',
      'https://www.lpzoo.org/wp-content/uploads/2024/02/camp_fr.jpg',
      'https://www.lpzoo.org/wp-content/uploads/2025/10/20250102_LMiller_winter_camp176.jpg'
    ],
    'https://www.lpzoo.org/youth-programs/zoo-camps/',
    true, v_host,
    jsonb_build_object(
      'partnerListing', true,
      'organizationName', 'Lincoln Park Zoo',
      'organizationSlug', 'lincoln-park-zoo',
      'organizationDescription', 'Lincoln Park Zoo is one of the oldest zoos in North America and one of the last free admission zoos in the country. Located on Chicago''s North Side, the zoo runs year-round education programs for kids, families, and schools.',
      'organizationLocation', 'Lincoln Park, Chicago',
      'organizationWebsite', 'https://www.lpzoo.org',
      'externalUrl', 'https://www.lpzoo.org/youth-programs/zoo-camps/',
      'dateLabel', 'Jun 8 – Aug 14',
      'price_unit', 'per week',
      'ageMin', 4,
      'ageMax', 11,
      'highlights', jsonb_build_array(
        'Five different weekly themes — mix and match up to 3',
        'Guided by professional zookeepers and educators',
        'Fully outdoors at one of the country''s last free-admission zoos',
        'Inclusion Specialist on-site every day',
        'Aftercare available until 5 p.m.'
      )
    )
  ) ON CONFLICT (slug) DO NOTHING;

  -- ── 3. Griffin Museum of Science & Industry — Summer Camps ────────────────
  INSERT INTO camps (
    slug, short_id, name, description, location,
    start_time, end_time,
    price_cents, listing_type, schedule_days,
    hero_image_url, image_urls,
    external_url, is_published, host_id, meta
  ) VALUES (
    'griffin-msi-summer-camps',
    'gms7y8z9',
    'Griffin Museum of Science & Industry Summer Camps',
    E'What if camp happened inside one of the world''s great science museums? Griffin MSI (formerly the Museum of Science and Industry) runs hands-on summer camps across the full age range — from Kindergartners building their first circuits to high schoolers fabricating projects with laser cutters and 3D printers in the Fab Lab.\n\nPrograms run Monday–Friday, 9 a.m.–3 p.m., with a new theme each week. Younger campers (K–3) explore nature, space, and art through guided experiments. Older campers (grades 4–9) take on engineering challenges, digital fabrication, and real scientific problem-solving. The two-week Fab Lab Apprentice intensive goes deepest, giving teens professional-grade experience with digital tools.',
    '5700 S DuSable Lake Shore Dr, Chicago, IL 60637',
    '2026-06-15', '2026-08-14',
    50000, 'camp', ARRAY['Mon','Tue','Wed','Thu','Fri'],
    'https://media.impactmit.com/image/upload/f_auto,c_limit,w_500/v1763850575/msi/Camps_Summer_Hero_RS_46251_f8e2625a4a.jpg',
    ARRAY[
      'https://media.impactmit.com/image/upload/f_auto,c_limit,w_500/v1763850575/msi/Camps_Summer_Hero_RS_46251_f8e2625a4a.jpg',
      'https://media.impactmit.com/image/upload/f_auto,c_limit,w_500/v1758560761/msi/RS_27048_SMK_MSI_Summer_Camp_AUG_5finals_204_fb1dd6e76c.jpg',
      'https://media.impactmit.com/image/upload/f_auto,c_limit,w_500/v1758560625/msi/RS_26964_SMK_MSI_Summer_Camp_AUG_5finals_120_9697a8ee2f.jpg',
      'https://media.impactmit.com/image/upload/f_auto,c_limit,w_500/v1758560643/msi/RS_26877_SMK_MSI_Summer_Camp_155_140c3f2102.jpg'
    ],
    'https://www.griffinmsi.org/camps-and-workshops/summer-camps',
    true, v_host,
    jsonb_build_object(
      'partnerListing', true,
      'organizationName', 'Griffin Museum of Science & Industry',
      'organizationSlug', 'griffin-msi',
      'organizationDescription', 'The Griffin Museum of Science and Industry (formerly MSI Chicago) is one of the largest science museums in the Western Hemisphere. Located in Hyde Park, the museum brings science and technology to life through immersive exhibits and year-round educational programs for all ages.',
      'organizationLocation', 'Hyde Park, Chicago',
      'organizationWebsite', 'https://www.griffinmsi.org',
      'externalUrl', 'https://www.griffinmsi.org/camps-and-workshops/summer-camps',
      'dateLabel', 'Jun 15 – Aug 14',
      'price_unit', 'per week',
      'ageMin', 5,
      'ageMax', 17,
      'highlights', jsonb_build_array(
        'Camps inside one of the world''s great science museums',
        'Programs for Kindergarten through high school',
        'Fab Lab Apprentice intensive for teens — laser cutting, 3D printing',
        'New theme every week across six different program tracks',
        'Scholarships available for demonstrated financial need'
      )
    )
  ) ON CONFLICT (slug) DO NOTHING;

  -- ── 4. Second City Comedy Camp — Ages 7–11 ───────────────────────────────
  INSERT INTO camps (
    slug, short_id, name, description, location,
    start_time, end_time,
    price_cents, listing_type, schedule_days,
    hero_image_url, image_urls,
    external_url, is_published, host_id, meta
  ) VALUES (
    'second-city-comedy-camp-kids',
    'sc7k0a1b',
    'Second City Comedy Camp (Ages 7–11)',
    E'The most famous comedy club in the world runs summer camp. Second City''s signature Comedy Camp for kids is packed with improv games, scene work, stand-up, and clowning — all taught the way Second City has always taught: by doing, laughing, and building each other up.\n\nMornings are all improv: games, scenes, and character work that build listening, confidence, and creative thinking without anyone realizing it. Afternoons shift to comedy writing and specialty skills — one week might focus on stand-up, another on physical comedy or clowning. Every session ends with a performance for family and friends.\n\nNo comedy experience needed. Just a willingness to be silly.',
    '230 W North Ave, Chicago, IL 60614',
    '2026-06-08', '2026-08-14',
    67500, 'camp', ARRAY['Mon','Tue','Wed','Thu','Fri'],
    'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80',
    ARRAY[
      'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80'
    ],
    'https://www.secondcity.com/classes/chicago/kids-and-teens-camps/camp-summer-7-11-chi',
    true, v_host,
    jsonb_build_object(
      'partnerListing', true,
      'organizationName', 'The Second City',
      'organizationSlug', 'second-city-chicago',
      'organizationDescription', 'The Second City is the world''s most celebrated comedy club and school of improvisation, and the launching pad for generations of comedians, writers, and performers. Located in Chicago''s Old Town neighborhood, the Training Center offers classes and camps for kids, teens, and adults year-round.',
      'organizationLocation', 'Old Town, Chicago',
      'organizationWebsite', 'https://www.secondcity.com',
      'externalUrl', 'https://www.secondcity.com/classes/chicago/kids-and-teens-camps/camp-summer-7-11-chi',
      'dateLabel', 'Jun 8 – Aug 14',
      'price_unit', 'per week',
      'ageMin', 7,
      'ageMax', 11,
      'highlights', jsonb_build_array(
        'Taught by the world''s most celebrated improv institution',
        'Improv, stand-up, clowning, and comedy writing',
        'Ends with a live performance for family and friends',
        'New session every week — June through August',
        'No experience necessary'
      )
    )
  ) ON CONFLICT (slug) DO NOTHING;

  -- ── 5. Second City Comedy Camp — Ages 12–18 ──────────────────────────────
  INSERT INTO camps (
    slug, short_id, name, description, location,
    start_time, end_time,
    price_cents, listing_type, schedule_days,
    hero_image_url, image_urls,
    external_url, is_published, host_id, meta
  ) VALUES (
    'second-city-comedy-camp-teens',
    'sc2t3c4d',
    'Second City Comedy Camp (Ages 12–18)',
    E'For teens ready to get serious about being funny. Second City''s Comedy Camp for ages 12–18 digs into the real craft behind improv and sketch — scene structure, character, storytelling, and the specific kind of listening that makes a scene actually work.\n\nMornings are built around improv fundamentals and ensemble work. Afternoons go deeper: satire writing, stand-up development, or sketch comedy depending on the week. The optional Advanced Comedy Camp (ages 14–18) is a three-week intensive culminating in a full Second City-style revue performed on the iconic Training Center stage.\n\nA rare chance to train where Tina Fey, Stephen Colbert, and Amy Poehler got their start.',
    '230 W North Ave, Chicago, IL 60614',
    '2026-06-08', '2026-08-14',
    67500, 'camp', ARRAY['Mon','Tue','Wed','Thu','Fri'],
    'https://images.unsplash.com/photo-1547948846-0039b8d2c45f?w=800&q=80',
    ARRAY[
      'https://images.unsplash.com/photo-1547948846-0039b8d2c45f?w=800&q=80'
    ],
    'https://www.secondcity.com/classes/chicago/kids-and-teens-camps/camp-summer-12-18-chi',
    true, v_host,
    jsonb_build_object(
      'partnerListing', true,
      'organizationName', 'The Second City',
      'organizationSlug', 'second-city-chicago',
      'organizationDescription', 'The Second City is the world''s most celebrated comedy club and school of improvisation, and the launching pad for generations of comedians, writers, and performers. Located in Chicago''s Old Town neighborhood, the Training Center offers classes and camps for kids, teens, and adults year-round.',
      'organizationLocation', 'Old Town, Chicago',
      'organizationWebsite', 'https://www.secondcity.com',
      'externalUrl', 'https://www.secondcity.com/classes/chicago/kids-and-teens-camps/camp-summer-12-18-chi',
      'dateLabel', 'Jun 8 – Aug 14',
      'price_unit', 'per week',
      'ageMin', 12,
      'ageMax', 18,
      'highlights', jsonb_build_array(
        'Train where Tina Fey, Stephen Colbert, and Amy Poehler got their start',
        'Improv, sketch writing, stand-up, and satire',
        'Advanced 3-week intensive available for ages 14–18',
        'Ends with a full live performance',
        'New session every week — June through August'
      )
    )
  ) ON CONFLICT (slug) DO NOTHING;

END $$;
