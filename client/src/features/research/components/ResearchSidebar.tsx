import { useState } from 'react';
import ExternalLinkIcon from '@/assets/external-link.svg?react';
import ResearchIcon from '@/assets/research.svg?react';
import SearchIcon from '@/assets/search.svg?react';
import researchData from '@/data/research.json';
import atlasData from '@/data/atlas.json';

// Helper to get atlas item display name
const getAtlasItemName = (itemId: string) => {
	for (const sec of atlasData) {
		const found = sec.items.find(item => item.id === itemId);
		if (found) return found.name;
	}
	return itemId.charAt(0).toUpperCase() + itemId.slice(1);
};

interface ResearchSidebarProps {
	onSelectItem: (item: string, section: string) => void;
	selectedItem: string | null;
}

export function ResearchSidebar({
	onSelectItem,
	selectedItem,
}: ResearchSidebarProps) {
	const [searchQuery, setSearchQuery] = useState('');

	const filteredPapers = researchData.filter(paper => {
		const query = searchQuery.toLowerCase();
		return (
			paper.title.toLowerCase().includes(query) ||
			paper.authors.some(author => author.toLowerCase().includes(query)) ||
			paper.journal.toLowerCase().includes(query) ||
			paper.tags.some(tag => tag.toLowerCase().includes(query))
		);
	});

	return (
		<div className='flex-1 overflow-y-auto flex flex-col h-full min-h-0'>
			{/* Header */}
			<div className='hidden md:block px-4 pt-5 pb-4 border-b border-gray-200/60'>
				<div className='flex items-center gap-3'>
					<div
						style={{
							width: 36,
							height: 36,
							borderRadius: 10,
							background:
								'linear-gradient(135deg, rgba(0,170,255,0.15), rgba(0,170,255,0.08))',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0,
						}}>
						<ResearchIcon className='w-[18px] h-[18px] text-[#00aaff]' />
					</div>
					<div>
						<p
							className='text-[13px] text-gray-800'
							style={{ fontWeight: 700 }}>
							Research Library
						</p>
						<p className='text-xs text-gray-500'>
							Explore neuroscience publications
						</p>
					</div>
				</div>
			</div>

			{/* Search */}
			<div className='px-3 pt-3 pb-1'>
				<div className='relative'>
					<SearchIcon className='absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
					<input
						type='text'
						placeholder='Search...'
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						className='w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200/60 bg-gray-50/50 placeholder:text-gray-400 focus:outline-none focus:border-[#00aaff]/50 focus:bg-white transition-colors duration-200'
					/>
				</div>
			</div>

			{/* Papers list */}
			<nav className='flex-1 overflow-y-auto py-2 px-2'>
				{filteredPapers.length > 0 ? (
					<div className='space-y-2'>
						{filteredPapers.map(paper => {
							const isSelected = selectedItem === paper.title;

							const concernsList: string[] = [];
							if (paper.relatedAtlasItems) {
								paper.relatedAtlasItems.forEach(itemId => {
									concernsList.push(getAtlasItemName(itemId));
								});
							}
							if (paper.relatedBrainAreas) {
								paper.relatedBrainAreas.forEach(areaName => {
									concernsList.push(areaName);
								});
							}
							const concernsText = concernsList.join(', ');

							return (
								<div
									key={paper.id}
									onClick={() => onSelectItem(paper.title, 'Research')}
									className={`block p-2.5 rounded-lg border transition-all duration-200 group cursor-pointer ${
										isSelected
											? 'border-[#00aaff]/40 bg-[#00aaff]/10'
											: 'border-gray-200/60 bg-gray-50/50 hover:border-[#00aaff]/40 hover:bg-[#00aaff]/5'
									}`}>
									<div className='flex items-start justify-between gap-1'>
										<p
											className={`text-sm font-medium leading-snug transition-colors duration-200 ${
												isSelected
													? 'text-[#00aaff]'
													: 'text-gray-800 group-hover:text-[#00aaff]'
											}`}>
											{paper.title}
										</p>
										<a
											href={paper.doi}
											target='_blank'
											rel='noopener noreferrer'
											onClick={e => e.stopPropagation()}
											className='text-gray-300 hover:text-[#00aaff] shrink-0 mt-0.5 transition-colors p-0.5 rounded hover:bg-gray-100'
											title='Open DOI link'>
											<ExternalLinkIcon className='w-3.5 h-3.5' />
										</a>
									</div>

									{concernsText && (
										<p className='mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2'>
											{concernsText}
										</p>
									)}

									<div className='flex items-center justify-between mt-1 text-xs text-gray-400'>
										<span
											className='truncate max-w-[180px]'
											title={paper.authors.join(', ')}>
											{paper.authors.join(', ')}
										</span>
										<span className='font-semibold text-[#00aaff] shrink-0'>
											{paper.year}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className='px-4 py-6 text-center'>
						<p className='text-sm text-gray-500'>No papers found</p>
					</div>
				)}
			</nav>
		</div>
	);
}
