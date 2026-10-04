export type LocalizedCare = readonly [english: string, urdu: string, arabic: string];
export type StorageKind = 'wholeSpice' | 'groundSpice' | 'leaves' | 'gum' | 'fruit' | 'nuts' | 'seeds' | 'groundSeeds' | 'snacks' | 'oil' | 'chilledOil' | 'cosmetic' | 'ghee' | 'honey' | 'panjeeri' | 'sugar' | 'bundle';
export interface CareEntry {
  use: LocalizedCare;
  storage: StorageKind;
  allergen?: LocalizedCare;
}
