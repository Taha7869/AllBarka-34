import React, { useMemo } from 'react';
import { Plus, Trash2, Scale, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCatalogProducts } from '../contexts/CatalogContext';
import {
  calculateFilledGiftEstimate,
  resolveAuthoritativeKgRate,
  MAX_RECIPE_INGREDIENTS,
  MAX_INGREDIENT_GRAMS,
  type RecipeIngredient,
} from '../lib/filledGiftPricing';
import { ItemField } from './AdminItemField';
import type { Product } from '../types';

export interface AdminRecipeEditorProps {
  recipeIngredients?: RecipeIngredient[] | null;
  filledRecipes?: Record<string, RecipeIngredient[]> | null;
  recipe_en?: string;
  recipe_ur?: string;
  recipe_ar?: string;
  variantOptions?: string[];
  disabled?: boolean;
  onChange: (patch: {
    recipeIngredients?: RecipeIngredient[] | null;
    filledRecipes?: Record<string, RecipeIngredient[]> | null;
    recipe_en?: string;
    recipe_ur?: string;
    recipe_ar?: string;
  }) => void;
}

export default function AdminRecipeEditor({
  recipeIngredients,
  filledRecipes,
  recipe_en,
  recipe_ur,
  recipe_ar,
  variantOptions = [],
  disabled = false,
  onChange,
}: AdminRecipeEditorProps) {
  const { t, language } = useLanguage();
  const catalogProducts = useCatalogProducts();

  // Eligible ingredient candidates: exclude packaging and gift categories, sort alphabetically
  const candidateProducts = useMemo(() => {
    return catalogProducts
      .filter(p => {
        const isPackaging = p.category === 'packaging' || p.category === 'gift-boxes' || p.commerce?.kind === 'packaging';
        return !isPackaging;
      })
      .map(p => {
        const name = (p as any)[`name_${language}`] || p.name_en || p.id;
        const kgRate = resolveAuthoritativeKgRate(p);
        return {
          id: p.id,
          name,
          category: p.category,
          kgRate,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogProducts, language]);

  const candidateMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; kgRate: number | null }>();
    for (const c of candidateProducts) map.set(c.id, c);
    return map;
  }, [candidateProducts]);

  const defaultIngredients = useMemo(() => recipeIngredients || [], [recipeIngredients]);

  const updateDefaultIngredients = (newList: RecipeIngredient[]) => {
    onChange({ recipeIngredients: newList.length > 0 ? newList : null });
  };

  const handleAddDefaultIngredient = () => {
    if (defaultIngredients.length >= MAX_RECIPE_INGREDIENTS) return;
    updateDefaultIngredients([...defaultIngredients, { productId: '', grams: 0 }]);
  };

  const handleRemoveDefaultIngredient = (index: number) => {
    const next = defaultIngredients.filter((_, i) => i !== index);
    updateDefaultIngredients(next);
  };

  const handleChangeDefaultIngredient = (index: number, patch: Partial<RecipeIngredient>) => {
    const next = defaultIngredients.map((item, i) => (i === index ? { ...item, ...patch } : item));
    updateDefaultIngredients(next);
  };

  // Recipe totals using canonical shared estimator
  const defaultSummary = useMemo(() => {
    let totalGrams = 0;
    for (const item of defaultIngredients) {
      totalGrams += Number(item.grams) || 0;
    }

    if (!defaultIngredients.length) {
      return { totalGrams: 0, totalCost: 0, hasMissingRate: false };
    }

    const hasIncompleteRow = defaultIngredients.some(
      item => !item.productId || !Number(item.grams) || Number(item.grams) <= 0
    );

    if (hasIncompleteRow) {
      return { totalGrams, totalCost: 0, hasMissingRate: true };
    }

    const estimate = calculateFilledGiftEstimate({
      recipe: defaultIngredients,
      catalogProducts,
      packagingRequired: false,
      requestedBoxes: 1,
    });

    const totalCost = estimate.ingredientsSubtotalPkr ?? 0;
    const hasMissingRate = !estimate.ingredientsAvailable || estimate.ingredientsSubtotalPkr === null;

    return { totalGrams, totalCost, hasMissingRate };
  }, [defaultIngredients, catalogProducts]);

  // Variant recipe totals
  const variantSummary = useMemo(() => {
    const map: Record<string, { totalGrams: number; totalCost: number; hasMissingRate: boolean }> = {};
    if (!filledRecipes) return map;
    for (const [variantLabel, ingredients] of Object.entries(filledRecipes)) {
      let totalGrams = 0;
      for (const item of ingredients) {
        totalGrams += Number(item.grams) || 0;
      }
      const hasIncompleteRow = ingredients.some(
        item => !item.productId || !Number(item.grams) || Number(item.grams) <= 0
      );
      if (hasIncompleteRow || !ingredients.length) {
        map[variantLabel] = { totalGrams, totalCost: 0, hasMissingRate: true };
        continue;
      }
      const estimate = calculateFilledGiftEstimate({
        recipe: ingredients,
        catalogProducts,
        packagingRequired: false,
        requestedBoxes: 1,
      });
      map[variantLabel] = {
        totalGrams,
        totalCost: estimate.ingredientsSubtotalPkr ?? 0,
        hasMissingRate: !estimate.ingredientsAvailable || estimate.ingredientsSubtotalPkr === null,
      };
    }
    return map;
  }, [filledRecipes, catalogProducts]);

  // Variant recipe handlers
  const handleToggleVariantRecipe = (variantLabel: string, enabled: boolean) => {
    const current = { ...(filledRecipes || {}) };
    if (enabled) {
      const hasConfiguredDefault = defaultIngredients.length > 0 && defaultIngredients.some(i => i.productId && Number(i.grams) > 0);
      current[variantLabel] = hasConfiguredDefault ? structuredClone(defaultIngredients) : [{ productId: '', grams: 0 }];
    } else {
      delete current[variantLabel];
    }
    onChange({ filledRecipes: Object.keys(current).length > 0 ? current : null });
  };

  const handleUpdateVariantIngredients = (variantLabel: string, newList: RecipeIngredient[]) => {
    const current = { ...(filledRecipes || {}) };
    if (newList.length > 0) {
      current[variantLabel] = newList;
    } else {
      delete current[variantLabel];
    }
    onChange({ filledRecipes: Object.keys(current).length > 0 ? current : null });
  };

  return (
    <div className="item-stack">
      <div>
        <h4>{t('item.recipeIngredients', 'Default Filling Recipe')}</h4>
        <p className="item-hint">
          {t('item.recipeDesc', 'Configure dry fruit, date and nut filling ingredients and gram weights per box for quotation estimates.')}
        </p>
      </div>

      {/* Default Ingredients Table/List */}
      <div className="item-stack">
        {defaultIngredients.map((item, index) => {
          const candidate = candidateMap.get(item.productId);
          const kgRate = candidate?.kgRate ?? null;
          const grams = Number(item.grams) || 0;
          const rowCost = kgRate !== null && kgRate > 0 && grams > 0 ? Math.round((kgRate * grams) / 1000) : null;

          return (
            <div key={index} className="item-option item-stack" style={{ background: 'var(--color-surface)' }}>
              <div className="item-grid">
                <ItemField label={t('item.ingredientProduct', 'Ingredient product')} required>
                  <select
                    disabled={disabled}
                    value={item.productId}
                    onChange={e => handleChangeDefaultIngredient(index, { productId: e.target.value })}
                  >
                    <option value="">-- {t('item.select', 'Select')} --</option>
                    {candidateProducts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.id}) — {c.kgRate !== null ? `Rs. ${c.kgRate.toLocaleString()}/kg` : t('item.noKgRate', 'No 1kg rate')}
                      </option>
                    ))}
                  </select>
                </ItemField>

                <ItemField label={t('item.ingredientGrams', 'Net grams per box')} required>
                  <input
                    disabled={disabled}
                    type="number"
                    step="any"
                    min="0.1"
                    max={MAX_INGREDIENT_GRAMS}
                    value={item.grams ? item.grams : ''}
                    placeholder="e.g. 50"
                    onChange={e => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      handleChangeDefaultIngredient(index, { grams: val });
                    }}
                  />
                </ItemField>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <Scale size={16} />
                  <span>
                    {!item.productId ? (
                      <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={14} />
                        {t('item.selectProductRequired', 'Select an ingredient product')}
                      </span>
                    ) : kgRate !== null ? (
                      <>
                        <bdi>Rs. {kgRate.toLocaleString()} / kg</bdi>
                        {rowCost !== null && (
                          <span style={{ marginInlineStart: '8px', color: 'var(--color-accent-text)', fontWeight: 600 }}>
                            → <bdi>Rs. {rowCost.toLocaleString()} PKR</bdi> / box
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={14} />
                        {t('item.noKgRate', 'No 1kg rate — team quote required')}
                      </span>
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleRemoveDefaultIngredient(index)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c' }}
                >
                  <Trash2 size={16} /> {t('item.remove', 'Remove')}
                </button>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          disabled={disabled || defaultIngredients.length >= MAX_RECIPE_INGREDIENTS}
          onClick={handleAddDefaultIngredient}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Plus size={16} /> {t('item.addIngredient', 'Add Ingredient')}
        </button>

        {defaultIngredients.length > 0 && (
          <div
            className="item-option"
            style={{
              background: 'color-mix(in srgb, var(--color-base) 94%, #C7982F)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <strong>{t('item.totalFillingGrams', 'Total filling mass')}: </strong>
              <span>{defaultSummary.totalGrams}g per box</span>
            </div>
            <div>
              <strong>{t('item.totalFillingEstimate', 'Total ingredient estimate')}: </strong>
              {!defaultSummary.hasMissingRate ? (
                <span style={{ color: 'var(--color-accent-text)', fontWeight: 700 }}>
                  <bdi>Rs. {defaultSummary.totalCost.toLocaleString()} PKR</bdi> / box
                </span>
              ) : (
                <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                  {t('item.incompleteEstimate', 'Incomplete estimate — team quote required')}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Localized Recipe Descriptions */}
      <details className="item-option">
        <summary>{t('item.recipeDescriptions', 'Customer Recipe Descriptions (EN / UR / AR)')}</summary>
        <div className="item-stack" style={{ marginTop: '12px' }}>
          <ItemField label={t('item.recipeTextEn', 'Recipe description (English)')}>
            <textarea
              disabled={disabled}
              value={recipe_en || ''}
              placeholder="e.g. 50g Roasted Pistachios & 50g Ajwa Dates per box"
              onChange={e => onChange({ recipe_en: e.target.value })}
            />
          </ItemField>
          <ItemField label={t('item.recipeTextUr', 'Recipe description (Urdu)')}>
            <textarea
              dir="rtl"
              disabled={disabled}
              value={recipe_ur || ''}
              placeholder="مثال: ۵۰ گرام پستہ اور ۵۰ گرام عجوہ کھجور فی ڈبہ"
              onChange={e => onChange({ recipe_ur: e.target.value })}
            />
          </ItemField>
          <ItemField label={t('item.recipeTextAr', 'Recipe description (Arabic)')}>
            <textarea
              dir="rtl"
              disabled={disabled}
              value={recipe_ar || ''}
              placeholder="مثال: 50 غرام فستق محمص و 50 غرام تمر عجوة لكل صندوق"
              onChange={e => onChange({ recipe_ar: e.target.value })}
            />
          </ItemField>
        </div>
      </details>

      {/* Variant-Specific Recipe Overrides */}
      {variantOptions.length > 0 && (
        <details className="item-option">
          <summary>
            {t('item.variantRecipes', 'Variant-Specific Recipes')} ({Object.keys(filledRecipes || {}).length} custom)
          </summary>
          <div className="item-stack" style={{ marginTop: '12px' }}>
            <p className="item-hint">
              {t('item.variantRecipeHint', 'Override the default recipe for specific filled packaging variants.')}
            </p>

            {variantOptions.map(variantLabel => {
              const hasCustom = Boolean(filledRecipes && Object.hasOwn(filledRecipes, variantLabel));
              const variantIngredients = (filledRecipes && filledRecipes[variantLabel]) || [];

              return (
                <details key={variantLabel} className="item-option" open={hasCustom}>
                  <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      <strong>{variantLabel}</strong> · {hasCustom ? t('item.useCustomRecipe', 'Custom recipe') : t('item.useSharedRecipe', 'Default recipe')}
                    </span>
                  </summary>

                  <div className="item-stack" style={{ marginTop: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={hasCustom}
                        onChange={e => handleToggleVariantRecipe(variantLabel, e.target.checked)}
                      />
                      <span>{t('item.enableCustomRecipe', 'Enable custom recipe for this option')}</span>
                    </label>

                    {hasCustom && (
                      <div className="item-stack" style={{ marginInlineStart: '16px' }}>
                        {variantIngredients.map((item, vIdx) => {
                          const candidate = candidateMap.get(item.productId);
                          const kgRate = candidate?.kgRate ?? null;
                          const grams = Number(item.grams) || 0;
                          const rowCost = kgRate !== null && kgRate > 0 && grams > 0 ? Math.round((kgRate * grams) / 1000) : null;

                          return (
                            <div key={vIdx} className="item-option item-stack">
                              <div className="item-grid">
                                <ItemField label={t('item.ingredientProduct', 'Ingredient product')} required>
                                  <select
                                    disabled={disabled}
                                    value={item.productId}
                                    onChange={e => {
                                      const next = variantIngredients.map((ing, i) => (i === vIdx ? { ...ing, productId: e.target.value } : ing));
                                      handleUpdateVariantIngredients(variantLabel, next);
                                    }}
                                  >
                                    <option value="">-- {t('item.select', 'Select')} --</option>
                                    {candidateProducts.map(c => (
                                      <option key={c.id} value={c.id}>
                                        {c.name} ({c.id}) — {c.kgRate !== null ? `Rs. ${c.kgRate.toLocaleString()}/kg` : t('item.noKgRate', 'No 1kg rate')}
                                      </option>
                                    ))}
                                  </select>
                                </ItemField>

                                <ItemField label={t('item.ingredientGrams', 'Net grams per box')} required>
                                  <input
                                    disabled={disabled}
                                    type="number"
                                    step="any"
                                    min="0.1"
                                    max={MAX_INGREDIENT_GRAMS}
                                    value={item.grams ? item.grams : ''}
                                    onChange={e => {
                                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                                      const next = variantIngredients.map((ing, i) => (i === vIdx ? { ...ing, grams: val } : ing));
                                      handleUpdateVariantIngredients(variantLabel, next);
                                    }}
                                  />
                                </ItemField>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px' }}>
                                  {!item.productId ? (
                                    <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <AlertCircle size={14} />
                                      {t('item.selectProductRequired', 'Select an ingredient product')}
                                    </span>
                                  ) : kgRate !== null ? (
                                    <>
                                      <bdi>Rs. {kgRate.toLocaleString()} / kg</bdi>
                                      {rowCost !== null && (
                                        <span style={{ marginInlineStart: '8px', color: 'var(--color-accent-text)', fontWeight: 600 }}>
                                          → <bdi>Rs. {rowCost.toLocaleString()} PKR</bdi> / box
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <AlertCircle size={14} />
                                      {t('item.noKgRate', 'No 1kg rate')}
                                    </span>
                                  )}
                                </span>

                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => {
                                    const next = variantIngredients.filter((_, i) => i !== vIdx);
                                    handleUpdateVariantIngredients(variantLabel, next);
                                  }}
                                  style={{ color: '#b91c1c' }}
                                >
                                  <Trash2 size={14} /> {t('item.remove', 'Remove')}
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {variantIngredients.length > 0 && (
                          <div
                            className="item-option"
                            style={{
                              background: 'color-mix(in srgb, var(--color-base) 94%, #C7982F)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '12px',
                            }}
                          >
                            <div>
                              <strong>{t('item.totalFillingGrams', 'Total filling mass')}: </strong>
                              <span>{variantSummary[variantLabel]?.totalGrams ?? 0}g per box</span>
                            </div>
                            <div>
                              <strong>{t('item.totalFillingEstimate', 'Total ingredient estimate')}: </strong>
                              {variantSummary[variantLabel] && !variantSummary[variantLabel].hasMissingRate ? (
                                <span style={{ color: 'var(--color-accent-text)', fontWeight: 700 }}>
                                  <bdi>Rs. {variantSummary[variantLabel].totalCost.toLocaleString()} PKR</bdi> / box
                                </span>
                              ) : (
                                <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                                  {t('item.incompleteEstimate', 'Incomplete estimate — team quote required')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={disabled || variantIngredients.length >= MAX_RECIPE_INGREDIENTS}
                          onClick={() => {
                            handleUpdateVariantIngredients(variantLabel, [...variantIngredients, { productId: '', grams: 0 }]);
                          }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <Plus size={14} /> {t('item.addIngredient', 'Add Ingredient')}
                        </button>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
