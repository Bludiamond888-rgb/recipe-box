import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as db from './db'
import {
  CATEGORIES, buildShoppingItems, formatMinutes, formatQuantity, makeBackup, parseBackup, parseTags, scaleIngredient,
  searchRecipes, toLines, totalTime, uid, type Recipe, type ShopItem,
} from './logic'
import { compressPhoto } from './photo'
import { SAMPLES } from './samples'
import { STARTER_PHOTO, makeStarter } from './starter'
import { CHEF_RECIPES, chefPhotoUrl, makeChefRecipes } from './chef'
import {
  IconBack, IconBook, IconCamera, IconCart, IconCheck, IconClock, IconEdit, IconGear, IconHeart, IconImage, IconPlus,
  IconPot, IconSearch, IconTrash, IconUsers, Logo, PlateArt,
} from './icons'

type Tab = 'recipes' | 'favorites' | 'shopping' | 'settings'
type View =
  | { kind: 'recipe'; id: string }
  | { kind: 'edit'; id: string | null }
  | { kind: 'cook'; id: string; factor: number }
  | { kind: 'pick' }
  | null

const APP_VERSION = '1.0.0'

export default function App() {
  const [ready, setReady] = useState(false)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [shop, setShop] = useState<ShopItem[]>([])
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<Tab>('recipes')
  const [view, setViewState] = useState<View>(null)
  const [toast, setToast] = useState('')
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
      }))
      await db.seedChefRecipesOnce(chefDefs, async (url) => {
        const res = await fetch(url)
        return res.ok ? res.blob() : null
      }).catch(() => 0)
    }
    const [rs, sh, ph] = await Promise.all([db.getRecipes(), db.getShopping(), db.getAllPhotos()])
    setPhotos((old) => {
      Object.values(old).forEach((u) => URL.revokeObjectURL(u))
      const next: Record<string, string> = {}
      for (const [k, b] of ph) next[k] = URL.createObjectURL(b)
      return next
    })
    setRecipes(rs)
    setShop(sh.sort((a, b) => a.createdAt - b.createdAt))
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

  const current = view && 'id' in view && view.id ? recipes.find((r) => r.id === view.id) ?? null : null
  // A view that points at a deleted recipe falls back to the list.
  const activeView: View = view && 'id' in view && view.id && !current ? null : view

  let title = tab === 'recipes' ? 'Recipe Box' : tab === 'favorites' ? 'Favorites' : tab === 'shopping' ? 'Shopping List' : 'Settings'
  if (activeView?.kind === 'edit') title = activeView.id ? 'Edit Recipe' : 'New Recipe'
  if (activeView?.kind === 'cook') title = 'Cook Mode'
  if (activeView?.kind === 'pick') title = 'Add From Recipes'
  if (activeView?.kind === 'recipe') title = current?.category ?? 'Recipe'

  const headerAction = !activeView && (tab === 'recipes' || tab === 'favorites')
    ? <button className="hbtn primary" onClick={() => go({ kind: 'edit', id: null })} aria-label="Add recipe"><IconPlus size={22} /><span>Add</span></button>
    : activeView?.kind === 'recipe' && current
      ? <button className="hbtn" onClick={() => go({ kind: 'edit', id: current.id })} aria-label="Edit recipe"><IconEdit /><span>Edit</span></button>
      : null

  return (
    <>
      <header className="header">
        <div className="header-in">
          {activeView ? (
            <button className="hbtn back" onClick={back} aria-label="Back"><IconBack /></button>
          ) : (
            <span className="logo"><Logo /></span>
          )}
          <h1 className="htitle">{title}</h1>
          <div className="hright">{headerAction}</div>
        </div>
      </header>

      <main className="main">
        {!ready ? null : activeView?.kind === 'recipe' && current ? (
          <RecipeView
            key={current.id}
            r={current}
            photo={current.photoId ? photos[current.photoId] : undefined}
            onFav={() => toggleFav(current)}
            onCook={(factor) => go({ kind: 'cook', id: current.id, factor })}
            onShop={(factor) => addToShop([{ recipe: current, factor }])}
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
        ) : tab === 'recipes' || tab === 'favorites' ? (
          <RecipeList
            key={tab}
            recipes={recipes}
            photos={photos}
            favoritesOnly={tab === 'favorites'}
            onOpen={(r) => go({ kind: 'recipe', id: r.id })}
            onFav={toggleFav}
            onAdd={() => go({ kind: 'edit', id: null })}
            onSamples={loadSamples}
          />
        ) : tab === 'shopping' ? (
          <Shopping items={shop} onChange={saveShop} onPick={() => go({ kind: 'pick' })} hasRecipes={recipes.length > 0} />
        ) : (
          <Settings
            recipes={recipes}
            shop={shop}
            flash={flash}
            onReload={() => loadAll()}
            onSamples={loadSamples}
            onRemoveSamples={removeSamples}
          />
        )}
      </main>

      {toast && <div className="toast" role="status">{toast}</div>}

      <nav className="tabbar" aria-label="Sections">
        <div className="tabbar-in">
          {([
            ['recipes', 'Recipes', <IconBook key="b" />],
            ['favorites', 'Favorites', <IconHeart key="h" />],
            ['shopping', 'Shopping', <IconCart key="c" />],
            ['settings', 'Settings', <IconGear key="g" />],
          ] as const).map(([t, label, icon]) => (
            <button key={t} className={`tab${tab === t ? ' on' : ''}`} onClick={() => switchTab(t)} aria-current={tab === t ? 'page' : undefined}>
              {icon}
              <span>{label}</span>
              {t === 'shopping' && shop.some((i) => !i.checked) && <b className="badge">{shop.filter((i) => !i.checked).length}</b>}
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}

/* ------------------------------------------------------------------ */

function Thumb({ src, className = '' }: { src?: string; className?: string }) {
  return src ? <img className={`thumb ${className}`} src={src} alt="" /> : <div className={`thumb ph ${className}`}><PlateArt /></div>
}

function Meta({ r }: { r: Recipe }) {
  const t = totalTime(r)
  return (
    <span className="meta">
      {t && <span><IconClock />{formatMinutes(t)}</span>}
      {r.servings && <span><IconUsers />{formatQuantity(r.servings)}</span>}
    </span>
  )
}

function RecipeList(p: {
  recipes: Recipe[]; photos: Record<string, string>; favoritesOnly: boolean
  onOpen: (r: Recipe) => void; onFav: (r: Recipe) => void; onAdd: () => void; onSamples: () => void
}) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const pool = p.favoritesOnly ? p.recipes.filter((r) => r.favorite) : p.recipes
  const cats = useMemo(() => {
    const used = new Set(pool.map((r) => r.category))
    return [...CATEGORIES.filter((c) => used.has(c)), ...[...used].filter((c) => !(CATEGORIES as readonly string[]).includes(c))]
  }, [pool])
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
    <div className="pad">
      <label className="search">
        <IconSearch />
        <input type="search" inputMode="search" placeholder="Search name, ingredient or tag" value={query} onChange={(e) => setQuery(e.target.value)} enterKeyHint="search" />
        {query && <button className="clear" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
      </label>
      {cats.length > 1 && (
        <div className="chips" role="tablist">
          <button className={`chip${cat === null ? ' on' : ''}`} onClick={() => setCat(null)}>All</button>
          {cats.map((c) => <button key={c} className={`chip${cat === c ? ' on' : ''}`} onClick={() => setCat(cat === c ? null : c)}>{c}</button>)}
        </div>
      )}
      {list.length === 0 ? (
        <p className="none">No recipes match{query ? ` “${query}”` : ''}.</p>
      ) : (
        <div className="grid">
          {list.map((r) => (
            <article key={r.id} className="card" onClick={() => p.onOpen(r)}>
              <div className="card-img">
                <Thumb src={r.photoId ? p.photos[r.photoId] : undefined} />
                <button className={`fav${r.favorite ? ' on' : ''}`} onClick={(e) => { e.stopPropagation(); p.onFav(r) }} aria-label={r.favorite ? 'Remove from favorites' : 'Add to favorites'}>
                  <IconHeart filled={r.favorite} size={22} />
                </button>
              </div>
              <div className="card-body">
                <span className="card-cat">{r.category}</span>
                <h3>{r.title}</h3>
                <Meta r={r} />
              </div>
            </article>
          ))}
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

function RecipeView(p: { r: Recipe; photo?: string; onFav: () => void; onCook: (factor: number) => void; onShop: (factor: number) => void }) {
  const { r } = p
  const sc = useScale(r)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const toggle = (i: number) => setChecked((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })
  return (
    <div className="recipe">
      <div className="hero">
        <Thumb src={p.photo} className="hero-img" />
      </div>
      <div className="pad">
        <div className="title-row">
          <h2 className="rtitle">{r.title}</h2>
          <button className={`fav big${r.favorite ? ' on' : ''}`} onClick={p.onFav} aria-label={r.favorite ? 'Remove from favorites' : 'Add to favorites'}>
            <IconHeart filled={r.favorite} />
          </button>
        </div>
        <div className="facts">
          {r.prepMin ? <div><b>{formatMinutes(r.prepMin)}</b><span>Prep</span></div> : null}
          {r.cookMin ? <div><b>{formatMinutes(r.cookMin)}</b><span>Cook</span></div> : null}
          {totalTime(r) && r.prepMin && r.cookMin ? <div><b>{formatMinutes(totalTime(r))}</b><span>Total</span></div> : null}
          {r.servings ? <div><b>{formatQuantity(r.servings)}</b><span>Serves</span></div> : null}
        </div>
        {r.tags.length > 0 && <div className="tags">{r.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>}

        <button className="btn primary big cook-btn" onClick={() => p.onCook(sc.factor)} disabled={!r.steps.length}>
          <IconPot size={26} /> Start Cook Mode
        </button>

        <section className="sec">
          <div className="sec-head">
            <h3>Ingredients</h3>
          </div>
          <div className="scaler">
            <button className="round" onClick={() => sc.step(-1)} aria-label="Fewer servings">−</button>
            <div className="scaler-mid">
              <b>{sc.base ? formatQuantity(sc.servings) : `×${formatQuantity(sc.servings)}`}</b>
              <span>{sc.base ? (sc.servings === 1 ? 'serving' : 'servings') : 'batch'}</span>
            </div>
            <button className="round" onClick={() => sc.step(1)} aria-label="More servings">+</button>
            {sc.factor !== 1 && <button className="link" onClick={sc.reset}>Reset</button>}
          </div>
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
            <h3>Steps</h3>
            <ol className="steps">
              {r.steps.map((s, i) => <li key={i}><span className="num">{i + 1}</span><p>{s}</p></li>)}
            </ol>
          </section>
        )}

        {r.notes && (
          <section className="sec">
            <h3>Notes</h3>
            <p className="notes">{r.notes}</p>
          </section>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function CookMode({ r, factor, onDone }: { r: Recipe; factor: number; onDone: () => void }) {
  const [i, setI] = useState(0)
  const [showIng, setShowIng] = useState(false)
  const [awake, setAwake] = useState<'on' | 'off' | 'na'>('na')
  const n = r.steps.length

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

  return (
    <div className="cook">
      <div className="cook-top">
        <span className="cook-name">{r.title}</span>
        <span className={`awake ${awake}`}>{awake === 'on' ? 'Screen stays on' : awake === 'off' ? 'Screen may sleep' : ''}</span>
      </div>
      <div className="progress"><i style={{ width: `${((i + 1) / n) * 100}%` }} /></div>
      <div className="cook-count">Step {i + 1} of {n}</div>
      <p className="cook-step">{r.steps[i]}</p>
      <button className="link ing-toggle" onClick={() => setShowIng((s) => !s)}>{showIng ? 'Hide ingredients' : 'Show ingredients'}</button>
      {showIng && <ul className="cook-ing">{r.ingredients.map((l, k) => <li key={k}>{scaleIngredient(l, factor)}</li>)}</ul>}
      <div className="cook-nav">
        <button className="btn big" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>Back</button>
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
    await p.onSave({
      ...rest, title: title.trim(), category, tags: parseTags(tags), prepMin: n(prep), cookMin: n(cook), servings: n(servings),
      ingredients: toLines(ingredients), steps: toLines(steps, true), notes: notes.trim(),
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

function Shopping({ items, onChange, onPick, hasRecipes }: { items: ShopItem[]; onChange: (i: ShopItem[]) => void; onPick: () => void; hasRecipes: boolean }) {
  const [text, setText] = useState('')
  const open = items.filter((i) => !i.checked)
  const done = items.filter((i) => i.checked)
  const toggle = (id: string) => onChange(items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)))
  const add = () => {
    const lines = toLines(text)
    if (!lines.length) return
    onChange([...items, ...lines.map((t, k) => ({ id: uid(), text: t, checked: false, createdAt: Date.now() + k }))])
    setText('')
  }
  const Row = (i: ShopItem) => (
    <li key={i.id} className={i.checked ? 'done' : ''} onClick={() => toggle(i.id)}>
      <span className="box">{i.checked && <IconCheck />}</span>
      <span className="shop-text">{i.text}{i.recipeTitle && <small>{i.recipeTitle}</small>}</span>
    </li>
  )
  return (
    <div className="pad">
      {hasRecipes && <button className="btn primary big" onClick={onPick}><IconBook /> Add from recipes</button>}
      <form className="add-row" onSubmit={(e) => { e.preventDefault(); add() }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add an item, e.g. 1 dozen eggs" enterKeyHint="done" />
        <button type="submit" className="btn add-btn" aria-label="Add item"><IconPlus /></button>
      </form>
      {!items.length ? (
        <div className="empty small">
          <div className="empty-heart"><IconCart /></div>
          <h2>Your list is empty</h2>
          <p>{hasRecipes ? 'Pick recipes to pull in their ingredients, or type items above.' : 'Type items above, or add some recipes first.'}</p>
        </div>
      ) : (
        <>
          <ul className="checklist shop">{open.map(Row)}</ul>
          {done.length > 0 && <>
            <h4 className="done-head">In the cart ({done.length})</h4>
            <ul className="checklist shop">{done.map(Row)}</ul>
          </>}
          <div className="two">
            <button className="btn big" disabled={!done.length} onClick={() => onChange(open)}>Clear checked</button>
            <button className="btn danger big" onClick={() => { if (confirm('Clear the whole shopping list?')) onChange([]) }}>Clear all</button>
          </div>
        </>
      )}
    </div>
  )
}

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
  recipes: Recipe[]; shop: ShopItem[]; flash: (m: string) => void; onReload: () => Promise<void>
  onSamples: () => Promise<void>; onRemoveSamples: () => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const samples = p.recipes.filter((r) => r.sample).length

  const exportBackup = async () => {
    setBusy(true)
    try {
      const b = await makeBackup(p.recipes, p.shop, await db.getAllPhotos())
      const name = `recipe-box-backup-${new Date().toISOString().slice(0, 10)}.json`
      const file = new File([JSON.stringify(b)], name, { type: 'application/json' })
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
      if (nav.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Recipe Box backup' }) } catch { /* cancelled */ }
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
      await db.replaceAll(data.recipes, data.shopping, data.photos)
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
        <p className="muted">{p.recipes.length} recipe{p.recipes.length === 1 ? '' : 's'} · {p.recipes.filter((r) => r.photoId).length} with photos · saved on this device only.</p>
      </section>

      <section className="panel">
        <h3>Backup &amp; restore</h3>
        <p className="muted">Save everything — recipes, photos and your shopping list — to one file (e.g. in Files or iCloud Drive). Restore it on any phone.</p>
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
        <p className="muted">Delete every recipe, photo and the shopping list from this device.</p>
        <button className="btn danger big" onClick={async () => {
          if (!confirm('Erase ALL recipes, photos and the shopping list? Consider backing up first.')) return
          await db.replaceAll([], [], new Map())
          await p.onReload()
          p.flash('Everything erased')
        }}>Erase all data</button>
      </section>

      <p className="about"><Logo size={22} /> Recipe Box · v{APP_VERSION}<br />Tip: in Safari tap Share → Add to Home Screen.</p>
    </div>
  )
}
