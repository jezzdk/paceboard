export function Avatar({ login, size = 24 }) {
  return (
    <img
      src={`https://github.com/${login}.png?size=${size}`}
      alt={login}
      width={size} height={size}
      className="rounded-full bg-muted flex-shrink-0"
      onError={e => { e.target.style.display = "none" }}
    />
  )
}

export function AuthorCell({ login }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar login={login} size={22} />
      <span className="font-medium text-sm">{login}</span>
    </div>
  )
}
