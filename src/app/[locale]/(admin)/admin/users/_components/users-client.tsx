'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  UserPlus,
  Search,
  MoreVertical,
  Trash2,
  Shield,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import {
  createUserAction,
  updateUserRoleAction,
  deleteUserAction,
} from '@/lib/actions/admin-users'

type Profile = {
  id: string
  full_name: string
  email: string | null
  role: 'client' | 'staff' | 'admin'
  phone: string | null
  language: string
  created_at: string
  hotel_id: string
}

const addUserSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['staff', 'admin']),
  phone: z.string().optional(),
  language: z.enum(['en', 'fr', 'ar']),
})

type AddUserForm = z.infer<typeof addUserSchema>

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  admin: { bg: 'rgba(201,168,76,0.12)', color: '#B8922A' },
  staff: { bg: 'rgba(27,45,91,0.08)', color: '#1B2D5B' },
  client: { bg: 'rgba(248,240,232,0.8)', color: '#7A8BA8' },
}

function RoleBadge({ role }: { role: 'client' | 'staff' | 'admin' }) {
  const style = ROLE_COLORS[role] ?? ROLE_COLORS.client
  return (
    <span
      className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold capitalize"
      style={style}
    >
      {role}
    </span>
  )
}

interface UsersClientProps {
  users: Profile[]
  hotelId: string
}

export function UsersClient({ users, hotelId }: UsersClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'staff' | 'admin'>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddUserForm>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { role: 'staff', language: 'en' },
  })

  const filtered = users.filter((u) => {
    const matchSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  async function onAddUser(data: AddUserForm) {
    setActionError(null)
    const result = await createUserAction({
      ...data,
      hotelId,
    })
    if (result.error) {
      setActionError(result.error)
    } else {
      reset()
      setAddOpen(false)
      router.refresh()
    }
  }

  function handleRoleChange(profileId: string, role: 'client' | 'staff' | 'admin') {
    startTransition(async () => {
      const result = await updateUserRoleAction(profileId, role)
      if (result.error) setActionError(result.error)
      else router.refresh()
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteUserAction(deleteTarget.id)
      setDeleteTarget(null)
      if (result.error) setActionError(result.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
            style={{ color: '#7A8BA8' }}
          />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
            style={{ borderColor: 'rgba(27,45,91,0.12)' }}
          />
        </div>

        <Select value={roleFilter} onValueChange={(v) => setRoleFilter((v ?? 'all') as typeof roleFilter)}>
          <SelectTrigger className="w-36 rounded-xl" style={{ borderColor: 'rgba(27,45,91,0.12)' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-xl"
          style={{ background: '#1B2D5B', color: '#F8F0E8' }}
        >
          <UserPlus className="size-4" />
          Add User
        </Button>
      </div>

      {actionError && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(192,57,43,0.08)', color: '#C0392B' }}
        >
          {actionError}
          <button className="ml-2 underline" onClick={() => setActionError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card-warm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(248,240,232,0.5)', borderBottom: '1px solid rgba(27,45,91,0.06)' }}>
                {['Name', 'Email', 'Role', 'Phone', 'Language', 'Joined', ''].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: '#7A8BA8' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm" style={{ color: '#7A8BA8' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid rgba(27,45,91,0.04)' }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = 'rgba(248,240,232,0.5)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = '')
                    }
                  >
                    <td className="px-5 py-3.5 font-medium" style={{ color: '#1B2D5B' }}>
                      {user.full_name}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: '#7A8BA8' }}>
                      {user.email ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-5 py-3.5" style={{ color: '#7A8BA8' }}>
                      {user.phone ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 uppercase text-xs" style={{ color: '#7A8BA8' }}>
                      {user.language}
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: '#7A8BA8' }}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
                          style={{ color: '#7A8BA8' }}
                        >
                          <MoreVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#7A8BA8' }}>
                            Change Role
                          </div>
                          {(['client', 'staff', 'admin'] as const).map((r) => (
                            <DropdownMenuItem
                              key={r}
                              disabled={user.role === r || isPending}
                              onClick={() => handleRoleChange(user.id, r)}
                              className="capitalize"
                            >
                              <Shield className="size-3.5 mr-2" />
                              {r}
                              {user.role === r && ' (current)'}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setDeleteTarget(user)}
                          >
                            <Trash2 className="size-3.5 mr-2" />
                            Delete user
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { reset(); setActionError(null) } }}>
        <DialogContent
          className="sm:max-w-lg"
          style={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 8px 40px rgba(27,45,91,0.14)' }}
        >
          <DialogHeader>
            <DialogTitle className="font-heading text-xl" style={{ color: '#1B2D5B' }}>
              Add Team Member
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onAddUser)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                  Full Name
                </Label>
                <Input
                  {...register('fullName')}
                  placeholder="Jane Smith"
                  className="rounded-xl"
                  style={{ borderColor: 'rgba(27,45,91,0.12)' }}
                />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                  Email
                </Label>
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="jane@hotel.com"
                  className="rounded-xl"
                  style={{ borderColor: 'rgba(27,45,91,0.12)' }}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                  Password
                </Label>
                <Input
                  {...register('password')}
                  type="password"
                  placeholder="Min. 8 characters"
                  className="rounded-xl"
                  style={{ borderColor: 'rgba(27,45,91,0.12)' }}
                />
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                  Role
                </Label>
                <Select
                  value={watch('role')}
                  onValueChange={(v) => setValue('role', (v ?? 'staff') as 'staff' | 'admin')}
                >
                  <SelectTrigger className="rounded-xl" style={{ borderColor: 'rgba(27,45,91,0.12)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                  Language
                </Label>
                <Select
                  value={watch('language')}
                  onValueChange={(v) => setValue('language', (v ?? 'en') as 'en' | 'fr' | 'ar')}
                >
                  <SelectTrigger className="rounded-xl" style={{ borderColor: 'rgba(27,45,91,0.12)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#7A8BA8' }}>
                  Phone (optional)
                </Label>
                <Input
                  {...register('phone')}
                  placeholder="+1 555 000 0000"
                  className="rounded-xl"
                  style={{ borderColor: 'rgba(27,45,91,0.12)' }}
                />
              </div>
            </div>

            {actionError && (
              <p className="text-sm rounded-xl px-3 py-2" style={{ background: 'rgba(192,57,43,0.08)', color: '#C0392B' }}>
                {actionError}
              </p>
            )}

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                style={{ borderColor: 'rgba(27,45,91,0.12)', color: '#7A8BA8' }}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl"
                style={{ background: '#1B2D5B', color: '#F8F0E8' }}
              >
                {isSubmitting ? 'Creating…' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete User"
        description={`Are you sure you want to delete ${deleteTarget?.full_name}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={isPending}
        variant="destructive"
      />
    </div>
  )
}
