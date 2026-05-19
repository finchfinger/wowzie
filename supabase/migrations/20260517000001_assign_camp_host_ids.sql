-- Assign each partner camp to its correct org profile
-- Camps were all seeded with the Wowzi admin as host_id; now we point each
-- to the wowzi-managed org profile that was created for it.

UPDATE camps SET host_id = 'ff2243b6-d38d-4fa4-96fc-4594cb8f63b5'
WHERE meta->>'organizationName' = 'Chicago Children''s Theatre';

UPDATE camps SET host_id = '6858ba74-006c-4de2-8e8c-d55c2ddbef29'
WHERE meta->>'organizationName' = 'Lincoln Park Zoo';

UPDATE camps SET host_id = '1aa91a48-b784-444f-b51e-099c8d22399b'
WHERE meta->>'organizationName' IN ('Griffin Museum of Science & Industry', 'Griffin Museum of Science and Industry');

UPDATE camps SET host_id = '452d8b17-67e8-440b-940e-e1d54f1643b3'
WHERE meta->>'organizationName' = 'Lillstreet Art Center';

UPDATE camps SET host_id = 'd1c9016d-4d77-4284-9f92-199d7e5b2649'
WHERE meta->>'organizationName' = 'Chicago Botanic Garden';

UPDATE camps SET host_id = '82c53f99-76f6-458b-9e8a-f72c9894ab33'
WHERE meta->>'organizationName' = 'Old Town School of Folk Music';

UPDATE camps SET host_id = '270e121d-5f8a-430d-bdc7-89377d15577b'
WHERE meta->>'organizationName' = 'The Chopping Block';

UPDATE camps SET host_id = '1e64b754-3f86-48ff-8c73-4344f3ed2b39'
WHERE meta->>'organizationName' = 'Hubbard Street Dance Chicago';

UPDATE camps SET host_id = 'b6a5d258-3aad-4471-a483-8056d3f37393'
WHERE meta->>'organizationName' = 'Chicago Rocks';

UPDATE camps SET host_id = 'ef85c516-0cec-4178-876b-6c305ef252a9'
WHERE meta->>'organizationName' = 'Joffrey Ballet';
