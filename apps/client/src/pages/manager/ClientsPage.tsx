import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Mail,
  Phone,
  FolderKanban,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  X,
} from 'lucide-react';
import { ClientService } from '../../services/client.service';
import { Client } from '@antigravity/shared';

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ClientService.getClients();
      setClients(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingClient(null);
    setName('');
    setCompany('');
    setContactPerson('');
    setContactEmail('');
    setPhone('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setCompany(client.company);
    setContactPerson(client.contact_person);
    setContactEmail(client.contact_email);
    setPhone(client.phone || '');
    setNotes(client.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (editingClient) {
        await ClientService.updateClient(editingClient.id, {
          name,
          company,
          contact_person: contactPerson,
          contact_email: contactEmail,
          phone: phone || undefined,
          notes: notes || undefined,
        });
      } else {
        await ClientService.createClient({
          name,
          company,
          contact_person: contactPerson,
          contact_email: contactEmail,
          phone: phone || undefined,
          notes: notes || undefined,
        });
      }
      setIsModalOpen(false);
      await fetchClients();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (client.project_count && client.project_count > 0) {
      alert(`Cannot delete ${client.name} because they have ${client.project_count} associated project(s). Reassign or archive the projects first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete client "${client.name}"?`)) {
      return;
    }

    try {
      await ClientService.deleteClient(client.id);
      await fetchClients();
    } catch (err: any) {
      alert(`Failed to delete client: ${err.message}`);
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact_person.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Clients Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage client organizations, points of contact, and sponsored project portfolios.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Client</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client name, company, or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Showing {filteredClients.length} of {clients.length} clients
        </span>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Clients Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Clients Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? 'No client matched your search criteria.'
              : 'Add your first client to start organizing software and 3D modeling projects.'}
          </p>
          {!searchQuery && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Client</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {client.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">{client.company}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-full border border-slate-200 flex items-center gap-1">
                    <FolderKanban className="w-3 h-3 text-slate-400" />
                    <span>{client.project_count || 0} projects</span>
                  </span>
                </div>

                {client.notes && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3 line-clamp-2">
                    {client.notes}
                  </p>
                )}

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium w-16">Contact:</span>
                    <span className="font-semibold text-slate-800">{client.contact_person}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{client.contact_email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditModal(client)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                  title="Edit Client"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(client)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
                  title="Delete Client"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                {editingClient ? 'Edit Client' : 'Create New Client'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Apex Aerospace"
                    className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Company Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Apex Dynamics Inc."
                    className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. David Vance"
                    className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="d.vance@company.com"
                    className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1-555-0199"
                  className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Notes & Briefing</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key context, contract nuances, or relationship notes..."
                  className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-indigo-500/20 disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Saving...' : editingClient ? 'Update Client' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
