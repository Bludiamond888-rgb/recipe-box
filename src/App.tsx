import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as db from './db'
import {
  CATEGORIES, buildShoppingItems, formatMinutes, formatQuantity, makeBackup, parseBackup, parseTags, scaleIngredient,
  normalizeSourceUrl, searchRecipes, toLines, totalTime, uid,
  type Collection, type MealSlot, type Recipe, type ShopItem,
} from './logic'
import { compressPhoto } from './photo'
import { SAMPLES } from './samples'
import { STARTER_PHOTO, makeStarter } from './starter'
import { CHEF_RECIPES, chefPhotoUrl, makeChefRecipes } from './chef'
import {
  IconBack, IconBook, IconCalendar, IconCamera, IconCart, IconCheck, IconClose, IconEdit, IconExternal, IconFolder,
  IconGear, IconHeart, IconImage, IconImport, IconMic, IconPause, IconPlay, IconPlus, IconSearch, IconSpeaker, IconStop,
  IconTimer, IconTrash, Logo, PlateArt, StepPic,
} from './icons'
import { STEP_LABELS, stepKind } from './stepIcon'
import { detectLang, formatClock, parseTimers, sourceKind, splitTitle, type SourceKind } from './cook'
import { canSpeak, getAutoRead, setAutoRead, speak, stopSpeaking } from './speech'
import { canListen, getVoiceTrial, setVoiceTrial, startListening, type VoiceHandle } from './voice'
import { removeRecipeFromAllCollections, recipesForWeek, weekStart } from './organize'
import {
  CollectionDetail, CollectionPicker, CollectionsView, ImportView, MealPlanView, PickForCollection, PickForDay,
  ShoppingGrouped, StarRating,
} from './phaseViews'

type Tab = 'recipes' | 'favorites' | 'plan' | 'shopping' | 'settings'
type View =
  | { kind: 'recipe'; id: string }
  | { kind: 'edit'; id: string | null }
  | { kind: 'cook'; id: string; factor: number }
  | { kind: 'pick' }
  | { kind: 'collections' }
  | { kind: 'collection'; id: string }
  | { kind: 'pick-collection'; id: string }
  | { kind: 'pick-day'; date: string }
  | { kind: 'import' }
  | null

const APP_VERSION = '2.1.1'

export default function App() {
  const [ready, setReady] = useState(false)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [shop, setShop] = useState<ShopItem[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [mealPlan, setMealPlan] = useState<MealSlot[]>([])
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<Tab>('recipes')
  const [view, setViewState] = useState<View>(null)
  const [toast, setToast] = useState('')
  const [addMenu, setAddMenu] = useState(false)
  const toastTimer = useRef<number>(0)

  const flash = useCallback((msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }, [])

  const loadAll = useCallback(async (seed = false) => {
    if (seed) {
      await db.seedStarterOnce(makeStarter, async () => {
        const res = await fetch(STARTER_PHOTO)
        return res.ok ? res.blob() : null
      }).catch(() => false)
      const chefRecipes = makeChefRecipes()
      const chefDefs = CHEF_RECIPES.map((def, i) => ({
        recipe: chefRecipes[i],
        photoUrl: def.photo ? chefPhotoUrl(def.photo) : null,
        since: def.since,
      }))
      await db.seedChefRecipesOnce(chefDefs, async (url) => {
        const res = await fetch(url)
        return res.ok ? res.blob() : null
      }).catch(() => 0)
      await db.migrateChefSourceFieldsOnce(
        CHEF_RECIPES.map((def) => ({
          title: def.title,
          sourceUrl: def.sourceUrl,
          sourceLabel: def.sourceLabel,
          sourceNote: def.sourceNote,
        })),
      ).catch(() => 0)
    }
    const [rs, sh, ph, cols, plan] = await Promise.all([
      db.getRecipes(), db.getShopping(), db.getAllPhotos(), db.getCollections(), db.getMealPlan(),
    ])
    setPhotos((old) => {
      Object.values(old).forEach((u) => URL.revokeObjectURL(u))
      const next: Record<string, string> = {}
      for (const [k, b] of ph) next[k] = URL.createObjectURL(b)
      return next
    })
    setRecipes(rs)
    setShop(sh.sort((a, b) => a.createdAt - b.createdAt))
    setCollections(cols)
    setMealPlan(plan)
    setReady(true)
  }, [])

  useEffect(() => { loadAll(true) }, [loadAll])

  // Lightweight history so the back button / gesture closes sub-screens.
  const go = useCallback((v: View, replace = false) => {
    if (replace) history.replaceState({ v }, '')
    else history.pushState({ v }, '')
    setViewState(v)
    window.scrollTo(0, 0)
  }, [])
  const back = useCallback(() => {
    if (history.state?.v) history.back()
    else setViewState(null)
  }, [])
  useEffect(() => {
    const onPop = (e: PopStateEvent) => { setViewState((e.state?.v as View) ?? null); window.scrollTo(0, 0) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const switchTab = (t: Tab) => {
    history.replaceState(null, '')
    setViewState(null)
    setTab(t)
    window.scrollTo(0, 0)
  }

  const saveShop = useCallback(async (items: ShopItem[]) => { setShop(items); await db.setShopping(items) }, [])
  const saveCollections = useCallback(async (cols: Collection[]) => { setCollections(cols); await db.setCollections(cols) }, [])
  const saveMealPlan = useCallback(async (slots: MealSlot[]) => { setMealPlan(slots); await db.setMealPlan(slots) }, [])

  const toggleFav = async (r: Recipe) => {
    const nr = { ...r, favorite: !r.favorite }
    setRecipes((rs) => rs.map((x) => (x.id === r.id ? nr : x)))
    await db.putRecipe(nr)
  }

  const saveRecipe = async (r: Recipe, photo: Blob | null | undefined) => {
    // photo: undefined = unchanged, null = removed, Blob = new
    let photoId = r.photoId
    if (photo !== undefined) {
      if (photoId) { await db.deletePhoto(photoId); URL.revokeObjectURL(photos[photoId] ?? '') }
      photoId = null
      if (photo) {
        photoId = uid()
        await db.putPhoto(photoId, photo)
        const url = URL.createObjectURL(photo)
        setPhotos((p) => ({ ...p, [photoId!]: url }))
      }
    }
    const nr = { ...r, photoId, updatedAt: Date.now() }
    await db.putRecipe(nr)
    setRecipes((rs) => (rs.some((x) => x.id === nr.id) ? rs.map((x) => (x.id === nr.id ? nr : x)) : [...rs, nr]))
    return nr
  }

  const removeRecipe = async (r: Recipe) => {
    await db.deleteRecipe(r)
    setRecipes((rs) => rs.filter((x) => x.id !== r.id))
    const nextCols = removeRecipeFromAllCollections(collections, r.id)
    await saveCollections(nextCols)
    await saveMealPlan(mealPlan.filter((s) => s.recipeId !== r.id))
    flash('Recipe deleted')
  }

  const addToShop = async (picks: { recipe: Recipe; factor?: number }[]) => {
    const items = buildShoppingItems(picks, shop)
    await saveShop(items)
    const n = items.length - shop.length
    flash(n > 0 ? `Added ${n} item${n === 1 ? '' : 's'} to shopping list` : 'Shopping list updated')
  }

  const loadSamples = async () => {
    const now = Date.now()
    const have = new Set(recipes.filter((r) => r.sample).map((r) => r.title))
    let i = 0
    for (const s of SAMPLES) {
      if (have.has(s.title)) continue
      const { photo, ...rest } = s
      let blob: Blob | null = null
      try {
        const res = await fetch(`./samples/${photo}`)
        if (res.ok) blob = await res.blob()
      } catch { /* offline: sample without photo */ }
      await saveRecipe({ ...rest, id: uid(), photoId: null, sample: true, createdAt: now + i++, updatedAt: now }, blob ?? undefined)
    }
    flash('Sample recipes added')
  }

  const removeSamples = async () => {
    await db.deleteSampleRecipes()
    setRecipes((rs) => rs.filter((x) => !x.sample))
    flash('Sample recipes removed')
  }

  const recipeView = view && (view.kind === 'recipe' || view.kind === 'edit' || view.kind === 'cook')
  const current = recipeView && view && 'id' in view && view.id ? recipes.find((r) => r.id === view.id) ?? null : null
  // A recipe/edit/cook view that points at a deleted recipe falls back to the list.
  // Collection / plan / import views also carry an id (or date) and must not use this check.
  const activeView: View = recipeView && view && 'id' in view && view.id && !current ? null : view

  let title = tab === 'recipes' ? 'Sexy Recipe' : tab === 'favorites' ? 'Favorites' : tab === 'plan' ? 'Meal Plan' : tab === 'shopping' ? 'Shopping List' : 'Settings'
  if (activeView?.kind === 'edit') title = activeView.id ? 'Edit Recipe' : 'New Recipe'
  if (activeView?.kind === 'cook') title = current ? splitTitle(current.title).main : 'Cook Mode'
  if (activeView?.kind === 'pick') title = 'Add From Recipes'
  if (activeView?.kind === 'recipe') title = current?.category ?? 'Recipe'
  if (activeView?.kind === 'collections') title = 'Collections'
  if (activeView?.kind === 'collection') title = collections.find((c) => c.id === activeView.id)?.name ?? 'Collection'
  if (activeView?.kind === 'pick-collection') title = 'Add to Collection'
  if (activeView?.kind === 'pick-day') title = 'Plan a Day'
  if (activeView?.kind === 'import') title = 'Import Recipe'

  const headerAction = !activeView && (tab === 'recipes' || tab === 'favorites')
    ? (
      <div className="hmenu-wrap">
        <button className="hbtn primary" onClick={() => setAddMenu((m) => !m)} aria-label="Add" aria-expanded={addMenu}>
          <IconPlus size={22} /><span>Add</span>
        </button>
        {addMenu && (
          <div className="hmenu" role="menu">
            <button role="menuitem" onClick={() => { setAddMenu(false); go({ kind: 'edit', id: null }) }}><IconPlus size={18} /> New recipe</button>
            <button role="menuitem" onClick={() => { setAddMenu(false); go({ kind: 'import' }) }}><IconImport size={18} /> Import</button>
            <button role="menuitem" onClick={() => { setAddMenu(false); go({ kind: 'collections' }) }}><IconFolder size={18} /> Collections</button>
          </div>
        )}
      </div>
    )
    : activeView?.kind === 'recipe' && current
      ? <button className="hbtn" onClick={() => go({ kind: 'edit', id: current.id })} aria-label="Edit recipe"><IconEdit /><span>Edit</span></button>
      : null

  return (
    <>
      <header className={`header${activeView?.kind === 'cook' ? ' cooking' : ''}`}>
        <div className="header-in">
          {activeView ? (
            <button className={`hbtn back${activeView.kind === 'cook' ? ' close' : ''}`} onClick={back} aria-label="Back">{activeView.kind === 'cook' ? <IconClose /> : <IconBack />}</button>
          ) : (
            <span className="logo"><Logo /></span>
          )}
          <h1 className="htitle">{title}</h1>
          <div className="hright">{headerAction}</div>
        </div>
      </header>

      <main className={`main${activeView?.kind === 'cook' ? ' cooking' : ''}${activeView?.kind === 'recipe' ? ' with-cta' : ''}`} onClick={() => addMenu && setAddMenu(false)}>
        {!ready ? null : activeView?.kind === 'recipe' && current ? (
          <RecipeView
            key={current.id}
            r={current}
            photo={current.photoId ? photos[current.photoId] : undefined}
            collections={collections}
            onFav={() => toggleFav(current)}
            onCook={(factor) => go({ kind: 'cook', id: current.id, factor })}
            onShop={(factor) => addToShop([{ recipe: current, factor }])}
            onRate={async (rating) => {
              const nr = { ...current, rating: rating || undefined, updatedAt: Date.now() }
              setRecipes((rs) => rs.map((x) => (x.id === nr.id ? nr : x)))
              await db.putRecipe(nr)
            }}
            onCookNote={async (cookNote) => {
              const nr = { ...current, cookNote: cookNote.trim() || undefined, updatedAt: Date.now() }
              setRecipes((rs) => rs.map((x) => (x.id === nr.id ? nr : x)))
              await db.putRecipe(nr)
            }}
            onMarkCooked={async () => {
              const nr = { ...current, lastCookedAt: Date.now(), updatedAt: Date.now() }
              setRecipes((rs) => rs.map((x) => (x.id === nr.id ? nr : x)))
              await db.putRecipe(nr)
              flash('Marked as cooked')
            }}
            onCollections={saveCollections}
            onManageCollections={() => go({ kind: 'collections' })}
          />
        ) : activeView?.kind === 'edit' ? (
          <EditRecipe
            key={activeView.id ?? 'new'}
            r={current}
            photo={current?.photoId ? photos[current.photoId] : undefined}
            onCancel={back}
            onSave={async (r, ph) => {
              const saved = await saveRecipe(r, ph)
              flash('Recipe saved')
              if (activeView.id) back()
              else go({ kind: 'recipe', id: saved.id }, true)
            }}
            onDelete={async (r) => {
              await removeRecipe(r)
              history.replaceState(null, '')
              setViewState(null)
            }}
          />
        ) : activeView?.kind === 'cook' && current ? (
          <CookMode r={current} factor={activeView.factor} onDone={back} />
        ) : activeView?.kind === 'pick' ? (
          <PickRecipes recipes={recipes} photos={photos} onAdd={async (rs) => { await addToShop(rs.map((recipe) => ({ recipe }))); back() }} />
        ) : activeView?.kind === 'collections' ? (
          <CollectionsView
            collections={collections}
            recipes={recipes}
            photos={photos}
            onChange={saveCollections}
            onOpenRecipe={(id) => go({ kind: 'recipe', id })}
            onOpenCollection={(id) => go({ kind: 'collection', id })}
          />
        ) : activeView?.kind === 'collection' ? (
          (() => {
            const col = collections.find((c) => c.id === activeView.id)
            if (!col) return <p className="pad muted">Collection not found.</p>
            return (
              <CollectionDetail
                collection={col}
                recipes={recipes}
                photos={photos}
                onChange={async (c) => {
                  await saveCollections(collections.map((x) => (x.id === c.id ? c : x)))
                }}
                onOpenRecipe={(id) => go({ kind: 'recipe', id })}
                onAddRecipes={() => go({ kind: 'pick-collection', id: col.id })}
              />
            )
          })()
        ) : activeView?.kind === 'pick-collection' ? (
          (() => {
            const col = collections.find((c) => c.id === activeView.id)
            if (!col) return null
            return (
              <PickForCollection
                collection={col}
                recipes={recipes}
                photos={photos}
                onDone={async (c) => {
                  await saveCollections(collections.map((x) => (x.id === c.id ? c : x)))
                  flash('Collection updated')
                  back()
                }}
              />
            )
          })()
        ) : activeView?.kind === 'pick-day' ? (
          <PickForDay
            date={activeView.date}
            slots={mealPlan}
            recipes={recipes}
            photos={photos}
            onDone={async (slots) => { await saveMealPlan(slots); flash('Day saved'); back() }}
          />
        ) : activeView?.kind === 'import' ? (
          <ImportView
            onCancel={back}
            onSave={async (r, ph) => {
              const saved = await saveRecipe(r, ph)
              flash('Recipe imported')
              go({ kind: 'recipe', id: saved.id }, true)
            }}
          />
        ) : tab === 'recipes' || tab === 'favorites' ? (
          <RecipeList
            key={tab}
            recipes={recipes}
            photos={photos}
            collections={collections}
            favoritesOnly={tab === 'favorites'}
            onOpen={(r) => go({ kind: 'recipe', id: r.id })}
            onFav={toggleFav}
            onAdd={() => go({ kind: 'edit', id: null })}
            onSamples={loadSamples}
            onCollections={() => go({ kind: 'collections' })}
            onOpenCollection={(id) => go({ kind: 'collection', id })}
          />
        ) : tab === 'plan' ? (
          <MealPlanView
            slots={mealPlan}
            recipes={recipes}
            photos={photos}
            onChange={saveMealPlan}
            onOpenRecipe={(id) => go({ kind: 'recipe', id })}
            onPickDay={(date) => go({ kind: 'pick-day', date })}
            onSendToShop={async () => {
              const rs = recipesForWeek(mealPlan, recipes, weekStart())
              if (!rs.length) return
              await addToShop(rs.map((recipe) => ({ recipe })))
              switchTab('shopping')
            }}
          />
        ) : tab === 'shopping' ? (
          <ShoppingGrouped
            items={shop}
            onChange={saveShop}
            onPick={() => go({ kind: 'pick' })}
            onPlan={() => switchTab('plan')}
            hasRecipes={recipes.length > 0}
          />
        ) : (
          <Settings
            recipes={recipes}
            shop={shop}
            collections={collections}
            mealPlan={mealPlan}
            flash={flash}
            onReload={() => loadAll()}
            onSamples={loadSamples}
            onRemoveSamples={removeSamples}
          />
        )}
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}

      {activeView?.kind !== 'cook' && <nav className="tabbar" aria-label="Sections">
        <div className="tabbar-in five">
          {([
            ['recipes', 'Recipes', <IconBook key="b" />],
            ['favorites', 'Favorites', <IconHeart key="h" />],
            ['plan', 'Plan', <IconCalendar key="p" />],
            ['shopping', 'Shop', <IconCart key="c" />],
            ['settings', 'Settings', <IconGear key="g" />],
          ] as const).map(([t, label, icon]) => (
            <button key={t} className={`tab${tab === t ? ' on' : ''}`} onClick={() => switchTab(t)} aria-current={tab === t ? 'page' : undefined}>
              {icon}
              <span>{label}</span>
              {t === 'shopping' && shop.some((i) => !i.checked) && <b className="badge">{shop.filter((i) => !i.checked).length}</b>}
            </button>
          ))}
        </div>
      </nav>}
    </>
  )
}

/* ------------------------------------------------------------------ */

function Thumb({ src, className = '' }: { src?: string; className?: string }) {
  return src ? <img className={`thumb ${className}`} src={src} alt="" /> : <div className={`thumb ph ${className}`}><PlateArt /></div>
}

const SOURCE_BADGE: Record<SourceKind, string> = { xhs: '小红书', tiktok: 'TikTok', youtube: 'YouTube', instagram: 'Instagram', link: 'Link' }

function tileBadge(r: Recipe) {
  const k = sourceKind(r.sourceUrl, r.sourceLabel)
  if (k === 'xhs' || k === 'tiktok') return { text: SOURCE_BADGE[k], cls: `src-${k}` }
  return { text: r.category, cls: '' }
}

function RecipeList(p: {
  recipes: Recipe[]; photos: Record<string, string>; collections: Collection[]; favoritesOnly: boolean
  onOpen: (r: Recipe) => void; onFav: (r: Recipe) => void; onAdd: () => void; onSamples: () => void
  onCollections: () => void; onOpenCollection: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const [colId, setColId] = useState<string | null>(null)
  const pool0 = p.favoritesOnly ? p.recipes.filter((r) => r.favorite) : p.recipes
  const col = colId ? p.collections.find((c) => c.id === colId) : null
  const pool = col ? pool0.filter((r) => col.recipeIds.includes(r.id)) : pool0
  const cats = useMemo(() => {
    const used = new Set(pool0.map((r) => r.category))
    return [...CATEGORIES.filter((c) => used.has(c)), ...[...used].filter((c) => !(CATEGORIES as readonly string[]).includes(c))]
  }, [pool0])
  const list = searchRecipes(pool, { query, category: cat })

  if (!p.recipes.length) {
    return (
      <div className="empty">
        <div className="empty-art"><Logo size={88} /></div>
        <h2>Your recipe box is empty</h2>
        <p>Save the dishes you love — with photos, ingredients and steps — right on this phone.</p>
        <button className="btn primary big" onClick={p.onAdd}><IconPlus /> Add your first recipe</button>
        <button className="btn big" onClick={p.onSamples}>Load sample recipes</button>
      </div>
    )
  }
  if (p.favoritesOnly && !pool.length) {
    return (
      <div className="empty">
        <div className="empty-heart"><IconHeart size={56} /></div>
        <h2>No favorites yet</h2>
        <p>Tap the heart on any recipe to keep it here for quick access.</p>
      </div>
    )
  }
  return (
    <div className="pad home">
      <h2 className="greet">{p.favoritesOnly ? <>Your <em>favorites</em></> : <>What’s <em>cooking</em>,<br />Chairman?</>}</h2>
      <label className="search">
        <IconSearch />
        <input type="search" inputMode="search" placeholder="Search name, ingredient or tag" value={query} onChange={(e) => setQuery(e.target.value)} enterKeyHint="search" />
        {query && <button className="clear" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
      </label>
      <div className="chips" role="tablist">
        <button className={`chip${cat === null && !colId ? ' on' : ''}`} onClick={() => { setCat(null); setColId(null) }}>All</button>
        {cats.map((c) => <button key={c} className={`chip${cat === c ? ' on' : ''}`} onClick={() => { setColId(null); setCat(cat === c ? null : c) }}>{c}</button>)}
        {p.collections.map((c) => (
          <button key={c.id} className={`chip col${colId === c.id ? ' on' : ''}`} onClick={() => { setCat(null); setColId(colId === c.id ? null : c.id) }}>
            {c.name}
          </button>
        ))}
        <button className="chip ghost-chip" onClick={p.onCollections}>+ Collection</button>
      </div>
      <div className="list-head">
        <h3>{col?.name ?? cat ?? (p.favoritesOnly ? 'Favorites' : 'Your recipes')}</h3>
        <span className="list-count">{list.length}</span>
      </div>
      {list.length === 0 ? (
        <p className="none">No recipes match{query ? ` “${query}”` : ''}.</p>
      ) : (
        <div className="grid">
          {list.map((r) => {
            const { main, sub } = splitTitle(r.title)
            const badge = tileBadge(r)
            const t = totalTime(r)
            return (
              <article key={r.id} className="card" onClick={() => p.onOpen(r)}>
                <Thumb src={r.photoId ? p.photos[r.photoId] : undefined} />
                <span className={`tile-badge ${badge.cls}`}>{badge.text}</span>
                <button className={`fav${r.favorite ? ' on' : ''}`} onClick={(e) => { e.stopPropagation(); p.onFav(r) }} aria-label={r.favorite ? 'Remove from favorites' : 'Add to favorites'}>
                  <IconHeart filled={r.favorite} size={20} />
                </button>
                <div className="card-over">
                  <h3>{main}</h3>
                  <span className="card-meta">
                    {sub && <span className="zh" lang="zh-CN">{sub}</span>}
                    {sub && (t || r.rating) ? ' · ' : ''}
                    {r.rating ? `${'★'.repeat(r.rating)}${t ? ' · ' : ''}` : ''}
                    {t ? formatMinutes(t) : ''}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      )}
      <p className="count">{list.length} of {pool.length} recipe{pool.length === 1 ? '' : 's'}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function useScale(r: Recipe) {
  const base = r.servings && r.servings > 0 ? r.servings : null
  const [servings, setServings] = useState(base ?? 1)
  const factor = base ? servings / base : servings
  const step = (d: number) => setServings((s) => {
    if (base) return Math.max(1, Math.round(s + d))
    const n = s + d * 0.5
    return Math.max(0.5, Math.round(n * 2) / 2)
  })
  return { base, servings, factor, step, reset: () => setServings(base ?? 1) }
}

function SourceCard({ r }: { r: Recipe }) {
  const note = r.sourceNote?.trim() ?? ''
  const inspired = /^inspired by\b/i.test(note)
  const noteText = inspired ? (note.includes('·') ? note.split('·').slice(1).join('·').trim() : '') : note
  if (!r.sourceUrl) {
    if (!note) return null
    return (
      <div className="src-card plain">
        <span className="src-badge chef">Chef</span>
        <span className="src-text"><span className="source-note">{note}</span></span>
      </div>
    )
  }
  const url = normalizeSourceUrl(r.sourceUrl)
  const kind = sourceKind(r.sourceUrl, r.sourceLabel) ?? 'link'
  let host = 'Open link'
  try { host = new URL(url).hostname.replace(/^www\./, '') } catch { /* keep default */ }
  const label = r.sourceLabel?.trim() || host
  return (
    <a className="src-card" href={url} target="_blank" rel="noopener noreferrer">
      <span className={`src-badge src-${kind}`}>{SOURCE_BADGE[kind]}</span>
      <span className="src-text">
        <span className="source-kicker">{inspired ? 'Inspired by' : 'Source'}</span>
        <span className="source-label">{label.replace(/^(xiaohongshu|tiktok)\s*·\s*/i, '')}</span>
        {noteText && <span className="source-note">{noteText}</span>}
      </span>
      <span className="src-open">Open <IconExternal /></span>
    </a>
  )
}

function RecipeView(p: {
  r: Recipe; photo?: string; collections: Collection[]
  onFav: () => void; onCook: (factor: number) => void; onShop: (factor: number) => void
  onRate: (n: number) => void; onCookNote: (note: string) => void; onMarkCooked: () => void
  onCollections: (cols: Collection[]) => void; onManageCollections: () => void
}) {
  const { r } = p
  const sc = useScale(r)
  const { main, sub } = splitTitle(r.title)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [note, setNote] = useState(r.cookNote ?? '')
  const [showCols, setShowCols] = useState(false)
  const toggle = (i: number) => setChecked((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })
  const cooked = r.lastCookedAt ? new Date(r.lastCookedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null
  return (
    <div className="recipe">
      <div className="hero">
        <Thumb src={p.photo} className="hero-img" />
      </div>
      <div className="pad">
        <div className="title-row">
          <div className="title-text">
            <h2 className="rtitle">{main}</h2>
            {sub && <p className="rsub zh" lang="zh-CN">{sub}</p>}
          </div>
          <button className={`fav big${r.favorite ? ' on' : ''}`} onClick={p.onFav} aria-label={r.favorite ? 'Remove from favorites' : 'Add to favorites'}>
            <IconHeart filled={r.favorite} size={24} />
          </button>
        </div>
        <div className="facts">
          {r.prepMin ? <div><b>{formatMinutes(r.prepMin)}</b><span>Prep</span></div> : null}
          {r.cookMin ? <div><b>{formatMinutes(r.cookMin)}</b><span>Cook</span></div> : null}
          {totalTime(r) && r.prepMin && r.cookMin ? <div><b>{formatMinutes(totalTime(r))}</b><span>Total</span></div> : null}
          {r.servings ? <div><b>{formatQuantity(r.servings)}</b><span>Serves</span></div> : null}
        </div>
        <div className="rate-row">
          <StarRating value={r.rating} onChange={p.onRate} />
          <button className="link" onClick={p.onMarkCooked}>{cooked ? `Cooked ${cooked}` : 'Mark cooked'}</button>
        </div>
        <SourceCard r={r} />
        {r.tags.length > 0 && <div className="tags">{r.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>}
        <section className="sec">
          <div className="sec-head">
            <h3>Collections</h3>
            <button className="link" onClick={() => setShowCols((s) => !s)}>{showCols ? 'Hide' : 'Add to…'}</button>
          </div>
          {showCols && (
            <CollectionPicker
              collections={p.collections}
              recipeId={r.id}
              onChange={p.onCollections}
              onManage={p.onManageCollections}
            />
          )}
          {!showCols && p.collections.some((c) => c.recipeIds.includes(r.id)) && (
            <div className="tags">
              {p.collections.filter((c) => c.recipeIds.includes(r.id)).map((c) => (
                <span key={c.id} className="tag col-tag">{c.name}</span>
              ))}
            </div>
          )}
        </section>

        <section className="sec">
          <div className="sec-head">
            <h3>Ingredients</h3>
            <div className="stepper scaler">
              <button className="round" onClick={() => sc.step(-1)} aria-label="Fewer servings">−</button>
              <span className="stepper-mid">{sc.base ? `${formatQuantity(sc.servings)} ${sc.servings === 1 ? 'serving' : 'servings'}` : `×${formatQuantity(sc.servings)} batch`}</span>
              <button className="round" onClick={() => sc.step(1)} aria-label="More servings">+</button>
            </div>
          </div>
          {sc.factor !== 1 && <button className="link reset" onClick={sc.reset}>Reset to {sc.base ? formatQuantity(sc.base) : '×1'}</button>}
          {r.ingredients.length ? (
            <ul className="checklist">
              {r.ingredients.map((line, i) => (
                <li key={i} className={checked.has(i) ? 'done' : ''} onClick={() => toggle(i)}>
                  <span className="box">{checked.has(i) && <IconCheck />}</span>
                  <span>{scaleIngredient(line, sc.factor)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="muted">No ingredients yet.</p>}
          {r.ingredients.length > 0 && (
            <button className="btn big" onClick={() => p.onShop(sc.factor)}><IconCart /> Add to shopping list</button>
          )}
        </section>

        {r.steps.length > 0 && (
          <section className="sec">
            <div className="sec-head"><h3>Steps</h3><span className="sec-count">{r.steps.length} steps</span></div>
            <ol className="steps">
              {r.steps.map((s, i) => (
                <li key={i}>
                  <div className="step-pic-wrap">
                    <StepPic kind={stepKind(s)} className="step-pic" />
                    <span className="num">{i + 1}</span>
                  </div>
                  <p>{s}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="sec">
          <h3>Your cook notes</h3>
          <p className="muted" style={{ marginTop: -6 }}>What you changed last time — stays on this phone.</p>
          <textarea
            className="cook-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => { if ((r.cookNote ?? '') !== note.trim()) p.onCookNote(note) }}
            placeholder="e.g. Extra chili, 2 min less sear…"
          />
        </section>

        {r.notes && (
          <section className="sec">
            <h3>Notes</h3>
            <p className="notes">{r.notes}</p>
          </section>
        )}
      </div>
      {r.steps.length > 0 && (
        <div className="cta-bar">
          <button className="btn primary big cook-btn" onClick={() => p.onCook(sc.factor)}>
            <IconPlay size={20} /> Start cooking
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

interface RunTimer { id: string; step: number; label: string; total: number; endsAt: number | null; left: number; done: boolean }

let audioCtx: AudioContext | null = null
function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!audioCtx && AC) audioCtx = new AC()
    audioCtx?.resume().catch(() => {})
  } catch { /* no audio */ }
}
function chime() {
  const ctx = audioCtx
  if (!ctx) return
  const t0 = ctx.currentTime
  for (let k = 0; k < 3; k++) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.0001, t0 + k * 0.45)
    g.gain.exponentialRampToValueAtTime(0.3, t0 + k * 0.45 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + k * 0.45 + 0.35)
    o.connect(g).connect(ctx.destination)
    o.start(t0 + k * 0.45)
    o.stop(t0 + k * 0.45 + 0.4)
  }
  navigator.vibrate?.([200, 120, 200])
}

function TimerRing({ frac }: { frac: number }) {
  const c = 2 * Math.PI * 26
  return (
    <svg className="ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="26" className="ring-bg" />
      <circle cx="32" cy="32" r="26" className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, frac)))} transform="rotate(-90 32 32)" />
    </svg>
  )
}

function CookMode({ r, factor, onDone }: { r: Recipe; factor: number; onDone: () => void }) {
  const [i, setI] = useState(0)
  const [showIng, setShowIng] = useState(false)
  const [awake, setAwake] = useState<'on' | 'off' | 'na'>('na')
  const [speaking, setSpeaking] = useState(false)
  const [autoRead, setAuto] = useState(getAutoRead)
  const [timers, setTimers] = useState<RunTimer[]>([])
  const [, setNow] = useState(0)
  const listenOk = canListen()
  const [voiceOn, setVoiceOn] = useState(() => listenOk && getVoiceTrial())
  const [listenStatus, setListenStatus] = useState<'off' | 'listening' | 'error'>('off')
  const [lastHeard, setLastHeard] = useState('')
  const listenRef = useRef<VoiceHandle | null>(null)
  const n = r.steps.length
  const step = r.steps[i] ?? ''
  const kind = stepKind(step)
  const found = useMemo(() => parseTimers(step), [step])
  const voice = canSpeak()

  useEffect(() => {
    type Sentinel = { release: () => Promise<void>; addEventListener: (t: string, f: () => void) => void }
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } }).wakeLock
    if (!wl) return
    let lock: Sentinel | null = null
    let alive = true
    const acquire = async () => {
      try {
        lock = await wl.request('screen')
        if (!alive) { lock.release(); return }
        setAwake('on')
        lock.addEventListener('release', () => alive && setAwake('off'))
      } catch { setAwake('off') }
    }
    const onVis = () => { if (document.visibilityState === 'visible') acquire() }
    acquire()
    document.addEventListener('visibilitychange', onVis)
    return () => { alive = false; document.removeEventListener('visibilitychange', onVis); lock?.release().catch(() => {}) }
  }, [])

  const readStep = useCallback((k: number) => {
    const text = r.steps[k]
    if (!text) return
    setSpeaking(true)
    speak(`Step ${k + 1}. ${text}`, () => setSpeaking(false))
  }, [r.steps])

  // Changing step stops reading, unless auto-read is on (then the new step is read).
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (autoRead) readStep(i)
    else { stopSpeaking(); setSpeaking(false) }
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopSpeaking(), [])

  // Tick while any timer runs; timers use end timestamps so they stay right after the phone sleeps.
  const running = timers.some((t) => t.endsAt && !t.done)
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const now = Date.now()
      setTimers((ts) => {
        let rang = false
        const next = ts.map((t) => {
          if (!t.endsAt || t.done) return t
          const left = (t.endsAt - now) / 1000
          if (left <= 0) { rang = true; return { ...t, left: 0, endsAt: null, done: true } }
          return { ...t, left }
        })
        if (rang) chime()
        return next
      })
      setNow(now)
    }, 250)
    return () => clearInterval(id)
  }, [running])

  const startTimer = (label: string, seconds: number) => {
    unlockAudio()
    setTimers((ts) => [...ts, { id: uid(), step: i, label, total: seconds, endsAt: Date.now() + seconds * 1000, left: seconds, done: false }])
  }
  const pauseResume = (id: string) => setTimers((ts) => ts.map((t) => t.id !== id || t.done ? t : t.endsAt
    ? { ...t, endsAt: null, left: Math.max(0, (t.endsAt - Date.now()) / 1000) }
    : { ...t, endsAt: Date.now() + t.left * 1000 }))
  const addMinute = (id: string) => { unlockAudio(); setTimers((ts) => ts.map((t) => t.id !== id ? t : t.done
    ? { ...t, done: false, total: 60, left: 60, endsAt: Date.now() + 60_000 }
    : { ...t, total: t.total + 60, left: t.left + 60, endsAt: t.endsAt ? t.endsAt + 60_000 : null })) }
  const dismiss = (id: string) => setTimers((ts) => ts.filter((t) => t.id !== id))

  const toggleRead = () => {
    if (speaking) { stopSpeaking(); setSpeaking(false) } else readStep(i)
  }
  const toggleAuto = () => { const v = !autoRead; setAuto(v); setAutoRead(v) }

  // Voice commands trial (off by default; hidden when SpeechRecognition is missing).
  useEffect(() => {
    listenRef.current?.stop()
    listenRef.current = null
    if (!voiceOn || !listenOk) { setListenStatus('off'); return }
    const handle = startListening(
      (cmd, raw) => {
        setLastHeard(raw)
        if (cmd === 'next') setI((x) => Math.min(n - 1, x + 1))
        else if (cmd === 'back') setI((x) => Math.max(0, x - 1))
        else if (cmd === 'repeat') readStep(i)
        else if (cmd === 'timer') {
          const f = parseTimers(r.steps[i] ?? '')[0]
          if (f) startTimer(f.label, f.seconds)
        } else if (cmd === 'done' && i >= n - 1) onDone()
      },
      (s, detail) => {
        if (s === 'listening') setListenStatus('listening')
        else if (s === 'error') { setListenStatus('error'); setLastHeard(detail ?? 'error') }
        else setListenStatus('off')
      },
    )
    listenRef.current = handle
    return () => { handle?.stop(); listenRef.current = null }
  }, [voiceOn, listenOk, i, n]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleVoice = () => {
    const v = !voiceOn
    setVoiceOn(v)
    setVoiceTrial(v)
    if (!v) setLastHeard('')
  }

  return (
    <div className="cook">
      <div className="cook-progress" aria-hidden="true">
        {r.steps.map((_, k) => <i key={k} className={k <= i ? 'on' : ''} />)}
      </div>
      <div className="cook-meta">
        <span className="cook-count">Step {i + 1} of {n} · {STEP_LABELS[kind]}</span>
        <span className={`awake ${awake}`}>{awake === 'on' ? 'Screen stays on' : awake === 'off' ? 'Screen may sleep' : ''}</span>
      </div>
      <div className="cook-pic">
        <StepPic kind={kind} size={168} />
      </div>
      <p className="cook-step" lang={detectLang(step) === 'zh-CN' ? 'zh-CN' : undefined}>{step}</p>

      {voice && (
        <div className="voice-row">
          <button className={`speak-btn${speaking ? ' on' : ''}`} onClick={toggleRead} aria-pressed={speaking}>
            {speaking ? <><IconStop size={20} /> Stop reading</> : <><IconSpeaker size={22} /> Read aloud</>}
          </button>
          <button className={`auto-read${autoRead ? ' on' : ''}`} role="switch" aria-checked={autoRead} onClick={toggleAuto}>
            <span className="switch"><i /></span> Auto-read
          </button>
        </div>
      )}

      {listenOk && (
        <div className="voice-trial">
          <button className={`mic-btn${voiceOn ? ' on' : ''}`} onClick={toggleVoice} aria-pressed={voiceOn}>
            <IconMic size={20} /> {voiceOn ? 'Listening…' : 'Voice trial'}
          </button>
          <span className="trial-badge">Trial</span>
          {voiceOn && (
            <p className="mic-hint">
              {listenStatus === 'listening' ? 'Say next, back, repeat, or start timer.' : listenStatus === 'error' ? lastHeard || 'Mic error' : 'Starting…'}
              {lastHeard && listenStatus === 'listening' ? ` Heard: “${lastHeard}”` : ''}
            </p>
          )}
          {!voiceOn && <p className="mic-hint">Optional. Home Screen apps may not listen reliably on iPhone.</p>}
        </div>
      )}

      {found.filter((f) => !timers.some((t) => t.step === i && t.label === f.label)).map((f) => (
        <button key={f.label} className="timer-chip" onClick={() => startTimer(f.label, f.seconds)}>
          <IconTimer /> Start {formatClock(f.seconds)} timer <small>“{f.label}”</small>
        </button>
      ))}

      {timers.map((t) => (
        <div key={t.id} className={`timer-card${t.done ? ' done' : ''}${!t.endsAt && !t.done ? ' paused' : ''}`}>
          <TimerRing frac={t.total ? t.left / t.total : 0} />
          <div className="timer-text">
            <b>{t.done ? 'Done!' : formatClock(t.left)}</b>
            <span>Step {t.step + 1} · {t.label}{!t.endsAt && !t.done ? ' · paused' : ''}</span>
          </div>
          <div className="timer-btns">
            {!t.done && <button onClick={() => pauseResume(t.id)} aria-label={t.endsAt ? 'Pause timer' : 'Resume timer'}>{t.endsAt ? <IconPause /> : <IconPlay size={18} />}</button>}
            <button onClick={() => addMinute(t.id)} aria-label="Add one minute">+1</button>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss timer"><IconClose size={18} /></button>
          </div>
        </div>
      ))}

      {i < n - 1 && (
        <div className="up-next">
          <StepPic kind={stepKind(r.steps[i + 1])} size={40} />
          <div><span>Up next · Step {i + 2}</span><p>{r.steps[i + 1]}</p></div>
        </div>
      )}

      <button className="link ing-toggle" onClick={() => setShowIng((s) => !s)}>{showIng ? 'Hide ingredients' : 'Show ingredients'}</button>
      {showIng && <ul className="cook-ing">{r.ingredients.map((l, k) => <li key={k}>{scaleIngredient(l, factor)}</li>)}</ul>}

      <div className="cook-nav">
        <button className="btn big" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}><IconBack /> Back</button>
        {i < n - 1
          ? <button className="btn primary big" onClick={() => setI((x) => Math.min(n - 1, x + 1))}>Next step</button>
          : <button className="btn primary big" onClick={onDone}><IconCheck size={24} /> Done</button>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function EditRecipe(p: {
  r: Recipe | null; photo?: string; onCancel: () => void
  onSave: (r: Recipe, photo: Blob | null | undefined) => Promise<void>; onDelete: (r: Recipe) => Promise<void>
}) {
  const r = p.r
  const [title, setTitle] = useState(r?.title ?? '')
  const [category, setCategory] = useState(r?.category ?? 'Dinner')
  const [tags, setTags] = useState(r?.tags.join(', ') ?? '')
  const [prep, setPrep] = useState(r?.prepMin?.toString() ?? '')
  const [cook, setCook] = useState(r?.cookMin?.toString() ?? '')
  const [servings, setServings] = useState(r?.servings?.toString() ?? '4')
  const [ingredients, setIngredients] = useState(r?.ingredients.join('\n') ?? '')
  const [steps, setSteps] = useState(r?.steps.join('\n') ?? '')
  const [notes, setNotes] = useState(r?.notes ?? '')
  const [sourceUrl, setSourceUrl] = useState(r?.sourceUrl ?? '')
  const [sourceLabel, setSourceLabel] = useState(r?.sourceLabel ?? '')
  const [photo, setPhoto] = useState<Blob | null | undefined>(undefined)
  const [preview, setPreview] = useState<string | undefined>(p.photo)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const camRef = useRef<HTMLInputElement>(null)
  const libRef = useRef<HTMLInputElement>(null)

  const onFile = async (f?: File) => {
    if (!f) return
    setBusy(true); setErr('')
    try {
      const b = await compressPhoto(f)
      setPhoto(b)
      setPreview(URL.createObjectURL(b))
    } catch { setErr('Sorry, that photo couldn’t be read. Try another one.') }
    setBusy(false)
  }

  const n = (s: string) => { const v = Number(s.replace(',', '.')); return s.trim() && isFinite(v) && v > 0 ? v : null }

  const submit = async () => {
    if (!title.trim()) { setErr('Please give the recipe a name.'); window.scrollTo(0, 0); return }
    setBusy(true)
    const now = Date.now()
    const base: Recipe = r ?? { id: uid(), title: '', category, tags: [], prepMin: null, cookMin: null, servings: null, ingredients: [], steps: [], notes: '', favorite: false, photoId: null, createdAt: now, updatedAt: now }
    const { sample: _s, ...rest } = base
    void _s
    const url = normalizeSourceUrl(sourceUrl)
    const label = sourceLabel.trim()
    const { sourceUrl: _su, sourceLabel: _sl, sourceNote: keepNote, ...restNoSource } = rest as Recipe & { sourceUrl?: string; sourceLabel?: string; sourceNote?: string }
    void _su; void _sl
    await p.onSave({
      ...restNoSource, title: title.trim(), category, tags: parseTags(tags), prepMin: n(prep), cookMin: n(cook), servings: n(servings),
      ingredients: toLines(ingredients), steps: toLines(steps, true), notes: notes.trim(),
      ...(url ? { sourceUrl: url } : {}),
      ...(label ? { sourceLabel: label } : {}),
      ...(keepNote ? { sourceNote: keepNote } : {}),
    }, photo)
    setBusy(false)
  }

  return (
    <form className="pad form" onSubmit={(e) => { e.preventDefault(); submit() }}>
      {err && <p className="err">{err}</p>}
      <div className="photo-pick">
        <Thumb src={preview} className="photo-prev" />
        <div className="photo-btns">
          <button type="button" className="btn" onClick={() => camRef.current?.click()} disabled={busy}><IconCamera /> Take photo</button>
          <button type="button" className="btn" onClick={() => libRef.current?.click()} disabled={busy}><IconImage /> Choose photo</button>
          {preview && <button type="button" className="btn ghost" onClick={() => { setPhoto(null); setPreview(undefined) }}>Remove photo</button>}
        </div>
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
        <input ref={libRef} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
      </div>

      <label className="field"><span>Recipe name</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Grandma’s lasagna" autoCapitalize="words" />
      </label>

      <div className="field"><span>Category</span>
        <div className="chips wrap">
          {CATEGORIES.map((c) => <button type="button" key={c} className={`chip${category === c ? ' on' : ''}`} onClick={() => setCategory(c)}>{c}</button>)}
        </div>
      </div>

      <label className="field"><span>Tags <em>(comma separated)</em></span>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="quick, vegetarian, kids" autoCapitalize="none" />
      </label>

      <div className="row3">
        <label className="field"><span>Prep (min)</span><input inputMode="numeric" value={prep} onChange={(e) => setPrep(e.target.value)} placeholder="15" /></label>
        <label className="field"><span>Cook (min)</span><input inputMode="numeric" value={cook} onChange={(e) => setCook(e.target.value)} placeholder="30" /></label>
        <label className="field"><span>Servings</span><input inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="4" /></label>
      </div>

      <label className="field"><span>Ingredients <em>(one per line, quantity first)</em></span>
        <textarea rows={7} value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder={'2 cups flour\n1 1/2 tsp salt\n3 eggs'} />
      </label>

      <label className="field"><span>Steps <em>(one per line)</em></span>
        <textarea rows={7} value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={'Heat the oven to 350°F.\nMix the dry ingredients.\nBake 25 minutes.'} />
      </label>

      <label className="field"><span>Notes</span>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tips, swaps, where it came from…" />
      </label>

      <div className="field-block">
        <p className="field-block-title">Source / Inspiration <em>(optional)</em></p>
        <label className="field"><span>Link URL</span>
          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="tiktok.com/@… or https://…" autoCapitalize="none" autoCorrect="off" inputMode="url" />
        </label>
        <label className="field"><span>Link label</span>
          <input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} placeholder="e.g. TikTok · @chef" autoCapitalize="words" />
        </label>
      </div>

      <button type="submit" className="btn primary big" disabled={busy}>{busy ? 'Saving…' : 'Save recipe'}</button>
      <button type="button" className="btn big" onClick={p.onCancel}>Cancel</button>
      {r && (
        <button type="button" className="btn danger big" onClick={() => { if (confirm(`Delete “${r.title}”? This can’t be undone.`)) p.onDelete(r) }}>
          <IconTrash /> Delete recipe
        </button>
      )}
    </form>
  )
}

/* ------------------------------------------------------------------ */

function PickRecipes({ recipes, photos, onAdd }: { recipes: Recipe[]; photos: Record<string, string>; onAdd: (r: Recipe[]) => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const list = searchRecipes(recipes, { query, category: null })
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <div className="pad pick">
      <p className="muted">Choose recipes — their ingredients go on your list (matching items are combined).</p>
      <label className="search">
        <IconSearch />
        <input type="search" placeholder="Search recipes" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <ul className="pick-list">
        {list.map((r) => (
          <li key={r.id} className={sel.has(r.id) ? 'on' : ''} onClick={() => toggle(r.id)}>
            <span className="box">{sel.has(r.id) && <IconCheck />}</span>
            <Thumb src={r.photoId ? photos[r.photoId] : undefined} className="mini" />
            <span className="pick-text"><b>{r.title}</b><small>{r.ingredients.length} ingredients</small></span>
          </li>
        ))}
      </ul>
      <div className="sticky-cta">
        <button className="btn primary big" disabled={!sel.size} onClick={() => onAdd(recipes.filter((r) => sel.has(r.id)))}>
          {sel.size ? `Add ingredients from ${sel.size} recipe${sel.size === 1 ? '' : 's'}` : 'Select recipes'}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Settings(p: {
  recipes: Recipe[]; shop: ShopItem[]; collections: Collection[]; mealPlan: MealSlot[]
  flash: (m: string) => void; onReload: () => Promise<void>
  onSamples: () => Promise<void>; onRemoveSamples: () => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const samples = p.recipes.filter((r) => r.sample).length

  const exportBackup = async () => {
    setBusy(true)
    try {
      const b = await makeBackup(p.recipes, p.shop, await db.getAllPhotos(), {
        collections: p.collections, mealPlan: p.mealPlan,
      })
      const name = `sexy-recipe-backup-${new Date().toISOString().slice(0, 10)}.json`
      const file = new File([JSON.stringify(b)], name, { type: 'application/json' })
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
      if (nav.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Sexy Recipe backup' }) } catch { /* cancelled */ }
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(file)
        a.download = name
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 4000)
      }
      p.flash('Backup ready')
    } catch { p.flash('Backup failed') }
    setBusy(false)
  }

  const restore = async (f?: File) => {
    if (!f) return
    try {
      const data = parseBackup(await f.text())
      if (!confirm(`Restore ${data.recipes.length} recipe${data.recipes.length === 1 ? '' : 's'} with ${data.photos.size} photo${data.photos.size === 1 ? '' : 's'}? This replaces everything currently in the app.`)) return
      setBusy(true)
      await db.replaceAll(data.recipes, data.shopping, data.photos, {
        collections: data.collections, mealPlan: data.mealPlan, clearOrganize: true,
      })
      await p.onReload()
      p.flash('Backup restored')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not restore that file.')
    }
    setBusy(false)
  }

  return (
    <div className="pad settings">
      <section className="panel">
        <h3>Your recipes</h3>
        <p className="muted">{p.recipes.length} recipe{p.recipes.length === 1 ? '' : 's'} · {p.collections.length} collection{p.collections.length === 1 ? '' : 's'} · {p.recipes.filter((r) => r.photoId).length} with photos · saved on this device only.</p>
      </section>

      <section className="panel">
        <h3>Backup &amp; restore</h3>
        <p className="muted">Save everything — recipes, photos, shopping list, collections, ratings, notes and meal plan — to one file. Restore it on any phone.</p>
        <button className="btn primary big" onClick={exportBackup} disabled={busy}>Back up now</button>
        <button className="btn big" onClick={() => fileRef.current?.click()} disabled={busy}>Restore from backup</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { restore(e.target.files?.[0]); e.target.value = '' }} />
      </section>

      <section className="panel">
        <h3>Sample recipes</h3>
        <p className="muted">{samples ? `${samples} sample recipe${samples === 1 ? ' is' : 's are'} in your box.` : 'Try the app with a few example dishes.'}</p>
        {samples < SAMPLES.length && <button className="btn big" onClick={() => p.onSamples()}>Load sample recipes</button>}
        {samples > 0 && <button className="btn big" onClick={() => { if (confirm('Remove all sample recipes? Your own recipes stay.')) p.onRemoveSamples() }}>Remove sample recipes</button>}
      </section>

      <section className="panel">
        <h3>Erase</h3>
        <p className="muted">Delete every recipe, photo, shopping list, collection and meal plan from this device.</p>
        <button className="btn danger big" onClick={async () => {
          if (!confirm('Erase ALL recipes, photos, shopping list, collections and meal plan? Consider backing up first.')) return
          await db.replaceAll([], [], new Map(), { clearOrganize: true })
          await p.onReload()
          p.flash('Everything erased')
        }}>Erase all data</button>
      </section>

      <p className="about"><Logo size={22} /> Sexy Recipe · v{APP_VERSION}<br />Tip: in Safari tap Share → Add to Home Screen.</p>
    </div>
  )
}
