import { supabase } from '@/integrations/supabase/client';
import seedData from '@/data/seed.json';

const TAG = '[AutoSeed]';

export async function autoSeedIfEmpty() {
  if (localStorage.getItem('studio_seed_applied')) {
    console.log(TAG, 'Seed already applied, skipping.');
    return;
  }

  try {
    console.log(TAG, 'Checking if database needs seeding...');

    const counts = await Promise.all([
      supabase.from('character_presets').select('id', { count: 'exact', head: true }),
      supabase.from('pose_presets').select('id', { count: 'exact', head: true }),
      supabase.from('clothing_presets').select('id', { count: 'exact', head: true }),
      supabase.from('background_presets').select('id', { count: 'exact', head: true }),
      supabase.from('settings_presets').select('id', { count: 'exact', head: true }),
    ]);

    const totalCount = counts.reduce((sum, r) => sum + (r.count ?? 0), 0);
    console.log(TAG, `Total existing rows: ${totalCount}`);

    if (totalCount > 0) {
      console.log(TAG, 'Database already has data, skipping seed.');
      localStorage.setItem('studio_seed_applied', 'true');
      return;
    }

    const { characters, poses, clothing, backgrounds, settings } = seedData;
    const totalSeed = characters.length + poses.length + clothing.length + backgrounds.length + settings.length;

    if (totalSeed === 0) {
      console.log(TAG, 'Seed file is empty, nothing to insert.');
      localStorage.setItem('studio_seed_applied', 'true');
      return;
    }

    console.log(TAG, `Seeding ${totalSeed} records...`);

    if (characters.length > 0) {
      const { error } = await supabase.from('character_presets').insert(characters);
      if (error) console.error(TAG, 'Error seeding characters:', error);
      else console.log(TAG, `Seeded ${characters.length} character presets`);
    }

    if (poses.length > 0) {
      const { error } = await supabase.from('pose_presets').insert(poses);
      if (error) console.error(TAG, 'Error seeding poses:', error);
      else console.log(TAG, `Seeded ${poses.length} pose presets`);
    }

    if (clothing.length > 0) {
      const { error } = await supabase.from('clothing_presets').insert(clothing);
      if (error) console.error(TAG, 'Error seeding clothing:', error);
      else console.log(TAG, `Seeded ${clothing.length} clothing presets`);
    }

    if (backgrounds.length > 0) {
      const { error } = await supabase.from('background_presets').insert(backgrounds);
      if (error) console.error(TAG, 'Error seeding backgrounds:', error);
      else console.log(TAG, `Seeded ${backgrounds.length} background presets`);
    }

    if (settings.length > 0) {
      const { error } = await supabase.from('settings_presets').insert(settings);
      if (error) console.error(TAG, 'Error seeding settings:', error);
      else console.log(TAG, `Seeded ${settings.length} settings presets`);
    }

    console.log(TAG, 'Seeding complete!');
    localStorage.setItem('studio_seed_applied', 'true');
  } catch (err) {
    console.error(TAG, 'Unexpected error during seeding:', err);
  }
}
