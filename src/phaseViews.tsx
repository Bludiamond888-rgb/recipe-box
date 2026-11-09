// Phase 2–4 screens: collections, ratings, meal plan, import.
import { useState } from 'react'
import {
  CATEGORIES, formatMinutes, totalTime, uid, type Collection, type MealSlot, type Recipe, type ShopItem,
} from './logic'
import {
  collectionCount, emptyCollection, recipesInCollection, renameCollection, setDayRecipes,
  slotsForDate, toggleDayRecipe, toggleInCollection, weekDays, weekStart, groupByAisle, recipesForWeek,
} from './organize'
import { draftToRecipe, fetchRecipeFromUrl, parseRecipeText, type DraftRecipe } from './importRecipe'
import {
  IconBook, IconCalendar, IconCheck, IconClose, IconFolder, IconImport, IconPlus, IconSearch, IconStar, PlateArt,
} from './icons'
import { splitTitle } from './cook'

function Thumb({ src, className = '' }: { src?: string; className?: string }) {
  return src ? <img className={`thumb ${className}`} src={src} alt="" /> : <div className={`thumb ph ${className}`}><PlateArt /></div>
}

/* ---------------- Stars ---------------- */

export function StarRating(p: {
  value: number | null | undefined
  onChange?: (n: number) => void
  size?: number
  label?: string
}) {
  const v = p.value && p.value >= 1 ? Math.min(5, Math.round(p.value)) : 0
  return (
    <div className="stars" role={p.onChange ? 'group' : 'img'} aria-label={p.label ?? (v ? `${v} of 5 stars` : 'Not rated')}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star${n <= v ? ' on' : ''}`}
          disabled={!p.onChange}
          onClick={() => p.onChange?.(n === v ? 0 : n)}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
        >
          <IconStar filled={n <= v} size={p.size ?? 26} />
        </button>
      ))}
    </div>
  )
}

/* ---------------- Collections manage ---------------- */

export function CollectionsView(p: {
  collections: Collection[]
  recipes: Recipe[]
  photos: Record<string, string>
  onChange: (cols: Collection[]) => void
  onOpenRecipe: (id: string) => void
  onOpenCollection: (id: string) => void
}) {
  const [name, setName] = useState('')
  const add = () => {
    const n = name.trim()
    if (!n) return
    p.onChange([...p.collections, emptyCollection(n)])
    setName('')
  }
  return (
    <div className="pad">
      <p className="muted">Group recipes your way — Steak Night, Sauces, 中餐, Weeknight.</p>
      <form className="add-row" onSubmit={(e) => { e.preventDefault(); add() }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New collection name" enterKeyHint="done" />
        <button type="submit" className="btn add-btn" aria-label="Add collection"><IconPlus /></button>
      </form>
      {!p.collections.length ? (
        <div className="empty small">
          <div className="empty-heart"><IconFolder size={48} /></div>
          <h2>No collections yet</h2>
          <p>Create one above, then add recipes from any recipe page.</p>
        </div>
      ) : (
        <ul className="col-list">
          {p.collections.map((c) => {
            const n = collectionCount(c, p.recipes)
            const first = p.recipes.find((r) => c.recipeIds.includes(r.id) && r.photoId)
            return (
              <li key={c.id}>
                <button className="col-card" onClick={() => p.onOpenCollection(c.id)}>
                  <Thumb src={first?.photoId ? p.photos[first.photoId] : undefined} className="mini" />
                  <span className="col-text">
                    <b>{c.name}</b>
                    <small>{n} recipe{n === 1 ? '' : 's'}</small>
                  </span>
                </button>
                <button
                  className="icon-danger"
                  aria-label={`Delete ${c.name}`}
                  onClick={() => {
                    if (confirm(`Delete collection “${c.name}”? Recipes stay in your box.`)) {
                      p.onChange(p.collections.filter((x) => x.id !== c.id))
                    }
                  }}
                ><IconClose size={18} /></button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function CollectionDetail(p: {
  collection: Collection
  recipes: Recipe[]
  photos: Record<string, string>
  onChange: (c: Collection) => void
  onOpenRecipe: (id: string) => void
  onAddRecipes: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(p.collection.name)
  const list = recipesInCollection(p.recipes, p.collection)
  return (
    <div className="pad">
      {editing ? (
        <form className="add-row" onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) p.onChange(renameCollection(p.collection, name))
          setEditing(false)
        }}>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <button type="submit" className="btn add-btn"><IconCheck /></button>
        </form>
      ) : (
        <div className="col-detail-head">
          <h2>{p.collection.name}</h2>
          <button className="link" onClick={() => setEditing(true)}>Rename</button>
        </div>
      )}
      <button className="btn primary big" onClick={p.onAddRecipes}><IconPlus /> Add recipes</button>
      {!list.length ? (
        <p className="none">Nothing in this collection yet.</p>
      ) : (
        <ul className="pick-list" style={{ marginTop: 14 }}>
          {list.map((r) => {
            const { main } = splitTitle(r.title)
            return (
              <li key={r.id} onClick={() => p.onOpenRecipe(r.id)}>
                <Thumb src={r.photoId ? p.photos[r.photoId] : undefined} className="mini" />
                <span className="pick-text"><b>{main}</b><small>{r.category}</small></span>
                <button
                  className="icon-danger"
                  aria-label="Remove from collection"
                  onClick={(e) => {
                    e.stopPropagation()
                    p.onChange(toggleInCollection(p.collection, r.id))
                  }}
                ><IconClose size={18} /></button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function PickForCollection(p: {
  collection: Collection
  recipes: Recipe[]
  photos: Record<string, string>
  onDone: (c: Collection) => void
}) {
  const [sel, setSel] = useState(() => new Set(p.collection.recipeIds))
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const list = p.recipes.filter((r) => !q || r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.toLowerCase().includes(q)))
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <div className="pad pick">
      <p className="muted">Tap recipes to add or remove from “{p.collection.name}”.</p>
      <label className="search">
        <IconSearch />
        <input type="search" placeholder="Search recipes" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <ul className="pick-list">
        {list.map((r) => (
          <li key={r.id} className={sel.has(r.id) ? 'on' : ''} onClick={() => toggle(r.id)}>
            <span className="box">{sel.has(r.id) && <IconCheck />}</span>
            <Thumb src={r.photoId ? p.photos[r.photoId] : undefined} className="mini" />
            <span className="pick-text"><b>{splitTitle(r.title).main}</b><small>{r.category}</small></span>
          </li>
        ))}
      </ul>
      <div className="sticky-cta">
        <button className="btn primary big" onClick={() => p.onDone({ ...p.collection, recipeIds: [...sel], updatedAt: Date.now() })}>
          Save ({sel.size})
        </button>
      </div>
    </div>
  )
}

/* ---------------- Meal plan ---------------- */

export function MealPlanView(p: {
  slots: MealSlot[]
  recipes: Recipe[]
  photos: Record<string, string>
  onChange: (slots: MealSlot[]) => void
  onOpenRecipe: (id: string) => void
  onPickDay: (date: string) => void
  onSendToShop: () => void
}) {
  const start = weekStart()
  const days = weekDays(start)
  const [day, setDay] = useState(days.find((d) => d.date === new Date().toISOString().slice(0, 10))?.date ?? days[0].date)
  const daySlots = slotsForDate(p.slots, day)
  const weekRecipes = recipesForWeek(p.slots, p.recipes, start)
  return (
    <div className="pad plan">
      <p className="muted">Plan dinners for the week, then send everything to your shopping list.</p>
      <div className="day-strip" role="tablist">
        {days.map((d) => {
          const n = slotsForDate(p.slots, d.date).length
          return (
            <button key={d.date} className={`day-chip${day === d.date ? ' on' : ''}`} onClick={() => setDay(d.date)} role="tab" aria-selected={day === d.date}>
              <span>{d.label}</span>
              <b>{d.short.split(' ')[1]}</b>
              {n > 0 && <i>{n}</i>}
            </button>
          )
        })}
      </div>
      <div className="list-head">
        <h3>{days.find((d) => d.date === day)?.short}</h3>
        <button className="link" onClick={() => p.onPickDay(day)}>+ Add</button>
      </div>
      {!daySlots.length ? (
        <p className="none">Nothing planned — tap Add.</p>
      ) : (
        <ul className="pick-list">
          {daySlots.map((s) => {
            const r = p.recipes.find((x) => x.id === s.recipeId)
            if (!r) return null
            const { main } = splitTitle(r.title)
            return (
              <li key={s.recipeId}>
                <button className="plan-row" onClick={() => p.onOpenRecipe(r.id)}>
                  <Thumb src={r.photoId ? p.photos[r.photoId] : undefined} className="mini" />
                  <span className="pick-text"><b>{main}</b><small>{r.category}{totalTime(r) ? ` · ${formatMinutes(totalTime(r))}` : ''}</small></span>
                </button>
                <button className="icon-danger" aria-label="Remove from plan" onClick={() => p.onChange(toggleDayRecipe(p.slots, day, s.recipeId))}>
                  <IconClose size={18} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <button className="btn primary big" disabled={!weekRecipes.length} onClick={p.onSendToShop}>
        <IconBook /> Send week to shopping list{weekRecipes.length ? ` (${weekRecipes.length})` : ''}
      </button>
      <button className="btn big" disabled={!p.slots.length} onClick={() => { if (confirm('Clear the whole meal plan?')) p.onChange([]) }}>
        Clear plan
      </button>
    </div>
  )
}

export function PickForDay(p: {
  date: string
  slots: MealSlot[]
  recipes: Recipe[]
  photos: Record<string, string>
  onDone: (slots: MealSlot[]) => void
}) {
  const current = new Set(slotsForDate(p.slots, p.date).map((s) => s.recipeId))
  const [sel, setSel] = useState(current)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const list = p.recipes.filter((r) => !q || r.title.toLowerCase().includes(q))
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <div className="pad pick">
      <p className="muted">Pick recipes for this day.</p>
      <label className="search">
        <IconSearch />
        <input type="search" placeholder="Search recipes" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <ul className="pick-list">
        {list.map((r) => (
          <li key={r.id} className={sel.has(r.id) ? 'on' : ''} onClick={() => toggle(r.id)}>
            <span className="box">{sel.has(r.id) && <IconCheck />}</span>
            <Thumb src={r.photoId ? p.photos[r.photoId] : undefined} className="mini" />
            <span className="pick-text"><b>{splitTitle(r.title).main}</b></span>
          </li>
        ))}
      </ul>
      <div className="sticky-cta">
        <button className="btn primary big" onClick={() => p.onDone(setDayRecipes(p.slots, p.date, [...sel]))}>
          Save day ({sel.size})
        </button>
      </div>
    </div>
  )
}

/* ---------------- Enhanced shopping aisle groups ---------------- */

export function ShoppingGrouped(p: {
  items: ShopItem[]
  onChange: (i: ShopItem[]) => void
  onPick: () => void
  onPlan: () => void
  hasRecipes: boolean
}) {
  const [text, setText] = useState('')
  const open = p.items.filter((i) => !i.checked)
  const done = p.items.filter((i) => i.checked)
  const groups = groupByAisle(open)
  const toggle = (id: string) => p.onChange(p.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)))
  const add = () => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (!lines.length) return
    p.onChange([...p.items, ...lines.map((t, k) => ({ id: uid(), text: t, checked: false, createdAt: Date.now() + k }))])
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
      <div className="two" style={{ marginBottom: 4 }}>
        {p.hasRecipes && <button className="btn primary big" style={{ marginTop: 0 }} onClick={p.onPick}><IconBook /> From recipes</button>}
        <button className="btn big" style={{ marginTop: 0 }} onClick={p.onPlan}><IconCalendar size={22} /> Meal plan</button>
      </div>
      <form className="add-row" onSubmit={(e) => { e.preventDefault(); add() }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add an item, e.g. 1 dozen eggs" enterKeyHint="done" />
        <button type="submit" className="btn add-btn" aria-label="Add item"><IconPlus /></button>
      </form>
      {!p.items.length ? (
        <div className="empty small">
          <div className="empty-heart"><IconBook /></div>
          <h2>Your list is empty</h2>
          <p>{p.hasRecipes ? 'Pull ingredients from recipes or your meal plan, or type items above.' : 'Type items above, or add some recipes first.'}</p>
        </div>
      ) : (
        <>
          {groups.map((g) => (
            <div key={g.aisle}>
              <h4 className="aisle-head">{g.aisle}</h4>
              <ul className="checklist shop">{g.items.map(Row)}</ul>
            </div>
          ))}
          {done.length > 0 && <>
            <h4 className="done-head">In the cart ({done.length})</h4>
            <ul className="checklist shop">{done.map(Row)}</ul>
          </>}
          <div className="two">
            <button className="btn big" disabled={!done.length} onClick={() => p.onChange(open)}>Clear checked</button>
            <button className="btn danger big" onClick={() => { if (confirm('Clear the whole shopping list?')) p.onChange([]) }}>Clear all</button>
          </div>
        </>
      )}
    </div>
  )
}

/* ---------------- Import ---------------- */

export function ImportView(p: {
  onCancel: () => void
  onSave: (r: Recipe, photo?: Blob | null) => Promise<void>
}) {
  const [tab, setTab] = useState<'link' | 'paste'>('paste')
  const [url, setUrl] = useState('')
  const [raw, setRaw] = useState('')
  const [draft, setDraft] = useState<DraftRecipe | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  const applyText = () => {
    setErr('')
    const d = parseRecipeText(raw)
    if (!d.title && !d.ingredients.length && !d.steps.length) {
      setErr('Paste a recipe caption or text with a title, ingredients and steps.')
      return
    }
    setDraft(d)
    setInfo('Review and edit below, then save.')
  }

  const tryLink = async () => {
    setBusy(true); setErr(''); setInfo('')
    const res = await fetchRecipeFromUrl(url)
    setBusy(false)
    if (res.ok) {
      setDraft(res.draft)
      setTab('paste')
      setRaw([
        res.draft.title,
        '',
        'Ingredients',
        ...res.draft.ingredients,
        '',
        'Steps',
        ...res.draft.steps.map((s, i) => `${i + 1}. ${s}`),
        res.draft.notes ? `\nNotes\n${res.draft.notes}` : '',
      ].filter((x) => x !== undefined).join('\n'))
      setInfo('Found recipe markup — review before saving.')
    } else {
      setErr(res.message)
      setTab('paste')
      setInfo('Link import often fails in the browser. Paste the recipe text instead.')
    }
  }

  const save = async () => {
    if (!draft) return
    if (!draft.title.trim()) { setErr('Please give the recipe a name.'); return }
    setBusy(true)
    const r = draftToRecipe(draft)
    await p.onSave(r, undefined)
    setBusy(false)
  }

  if (draft) {
    return (
      <form className="pad form" onSubmit={(e) => { e.preventDefault(); save() }}>
        {err && <p className="err">{err}</p>}
        {info && <p className="import-info">{info}</p>}
        <label className="field"><span>Recipe name</span>
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </label>
        <div className="field"><span>Category</span>
          <div className="chips wrap">
            {CATEGORIES.map((c) => (
              <button type="button" key={c} className={`chip${draft.category === c ? ' on' : ''}`} onClick={() => setDraft({ ...draft, category: c })}>{c}</button>
            ))}
          </div>
        </div>
        <div className="row3">
          <label className="field"><span>Prep</span><input inputMode="numeric" value={draft.prepMin ?? ''} onChange={(e) => setDraft({ ...draft, prepMin: Number(e.target.value) || null })} /></label>
          <label className="field"><span>Cook</span><input inputMode="numeric" value={draft.cookMin ?? ''} onChange={(e) => setDraft({ ...draft, cookMin: Number(e.target.value) || null })} /></label>
          <label className="field"><span>Servings</span><input inputMode="decimal" value={draft.servings ?? ''} onChange={(e) => setDraft({ ...draft, servings: Number(e.target.value) || null })} /></label>
        </div>
        <label className="field"><span>Ingredients</span>
          <textarea rows={7} value={draft.ingredients.join('\n')} onChange={(e) => setDraft({ ...draft, ingredients: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean) })} />
        </label>
        <label className="field"><span>Steps</span>
          <textarea rows={7} value={draft.steps.join('\n')} onChange={(e) => setDraft({ ...draft, steps: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean) })} />
        </label>
        <label className="field"><span>Notes</span>
          <textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        </label>
        {draft.sourceUrl && (
          <p className="muted">Source: {draft.sourceLabel || draft.sourceUrl}</p>
        )}
        <button type="submit" className="btn primary big" disabled={busy}>{busy ? 'Saving…' : 'Save recipe'}</button>
        <button type="button" className="btn big" onClick={() => { setDraft(null); setInfo('') }}>Back to paste</button>
        <button type="button" className="btn ghost big" onClick={p.onCancel}>Cancel</button>
      </form>
    )
  }

  return (
    <div className="pad">
      <div className="seg">
        <button className={tab === 'paste' ? 'on' : ''} onClick={() => setTab('paste')}>Paste text</button>
        <button className={tab === 'link' ? 'on' : ''} onClick={() => setTab('link')}>From link</button>
      </div>
      {err && <p className="err">{err}</p>}
      {info && <p className="import-info">{info}</p>}
      {tab === 'link' ? (
        <>
          <p className="muted">Paste a recipe page URL. Sites that allow it (with schema.org Recipe markup) are filled in automatically. Xiaohongshu, TikTok and Instagram usually block this — use Paste text.</p>
          <label className="field"><span>Link</span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" autoCapitalize="none" />
          </label>
          <button className="btn primary big" disabled={busy || !url.trim()} onClick={tryLink}>{busy ? 'Fetching…' : 'Fetch recipe'}</button>
        </>
      ) : (
        <>
          <p className="muted">Paste a Xiaohongshu / TikTok caption, or text typed from a photo. Then review ingredients and steps before saving.</p>
          <label className="field"><span>Recipe text</span>
            <textarea rows={12} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={'Garlic Butter Steak\n\nIngredients\n2 steaks\n4 tbsp butter\n\nSteps\n1. Sear the steaks.\n2. Baste with butter.'} />
          </label>
          <button className="btn primary big" disabled={!raw.trim()} onClick={applyText}><IconImport /> Parse &amp; review</button>
        </>
      )}
      <button className="btn big" onClick={p.onCancel}>Cancel</button>
    </div>
  )
}

/* ---------------- Add-to-collection sheet (inline list) ---------------- */

export function CollectionPicker(p: {
  collections: Collection[]
  recipeId: string
  onChange: (cols: Collection[]) => void
  onManage: () => void
}) {
  if (!p.collections.length) {
    return (
      <div className="col-picker">
        <p className="muted">No collections yet.</p>
        <button className="btn" onClick={p.onManage}><IconFolder /> Create a collection</button>
      </div>
    )
  }
  return (
    <div className="col-picker">
      {p.collections.map((c) => {
        const on = c.recipeIds.includes(p.recipeId)
        return (
          <button key={c.id} className={`col-toggle${on ? ' on' : ''}`} onClick={() => {
            p.onChange(p.collections.map((x) => x.id === c.id ? toggleInCollection(x, p.recipeId) : x))
          }}>
            <span className="box">{on && <IconCheck />}</span>
            {c.name}
          </button>
        )
      })}
      <button className="link" onClick={p.onManage}>Manage collections</button>
    </div>
  )
}

