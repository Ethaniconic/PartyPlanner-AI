import React from 'react';
import { Star, MapPin, ExternalLink, Globe } from 'lucide-react';
import { Venue } from '../types';
import { motion } from 'motion/react';

interface VenueCardProps {
  venue: Venue;
  index: number;
}

export const VenueCard: React.FC<VenueCardProps> = ({ venue, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group relative bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-all duration-300"
    >
      <div className="aspect-video w-full bg-zinc-800 relative overflow-hidden">
        <img
          src={`https://picsum.photos/seed/${venue.name}/800/450`}
          alt={venue.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 border border-white/10">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span className="text-sm font-medium">{venue.rating || 'N/A'}</span>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold font-display mb-2 group-hover:text-emerald-400 transition-colors">
          {venue.name}
        </h3>
        
        <div className="flex items-start gap-2 text-zinc-400 text-sm mb-4">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{venue.address}</span>
        </div>

        <p className="text-zinc-300 text-sm leading-relaxed mb-6 line-clamp-3">
          {venue.description}
        </p>

        <div className="flex items-center gap-3">
          {venue.mapsUri && (
            <a
              href={venue.mapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-2.5 rounded-xl transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View on Maps
            </a>
          )}
          {venue.website && (
            <a
              href={venue.website}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 border border-white/10 hover:bg-white/5 rounded-xl transition-colors"
              title="Visit Website"
            >
              <Globe className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};
