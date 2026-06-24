import React from 'react';
import { cleanHtmlInline } from '../utils/htmlRenderer';

const StructuredDetails = ({
    items = [],
    className = 'space-y-4',
    titleClassName = 'text-xl font-bold text-[#0b3b75] dark:text-brand-gold leading-tight',
    textClassName = 'text-gray-700 dark:text-foreground/80 leading-8 text-base break-words [&_a]:text-sky-500 [&_a]:underline [&_a]:underline-offset-4',
    pairLabelClassName = 'text-gray-800 dark:text-foreground font-semibold',
    pairValueClassName = 'text-gray-700 dark:text-foreground/80 leading-8 break-words [&_a]:text-sky-500 [&_a]:underline [&_a]:underline-offset-4',
    valueStackClassName = 'space-y-2',
    layoutClassName = 'grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-x-4 gap-y-2 md:gap-y-4 items-start'
}) => {
    if (!items.length) return null;

    // Strip space-y-4/space-y-3 from className since we use grid gaps on the outer container
    const cleanedClassName = className.replace(/space-y-\d+/g, '').trim();

    return (
        <div className={`structured-details-container ${layoutClassName} ${cleanedClassName}`}>
            {items.map((item, index) => {
                if (item.type === 'title') {
                    return (
                        <h4 
                            key={item.id || index} 
                            className={`${titleClassName} md:col-span-2`}
                            dangerouslySetInnerHTML={{ __html: cleanHtmlInline(item.title) }}
                        />
                    );
                }

                if (item.type === 'text') {
                    return (
                        <div
                            key={item.id || index}
                            className={`${textClassName} md:col-span-2`}
                            dangerouslySetInnerHTML={{ __html: typeof item.text === 'string' ? item.text.replace(/&nbsp;|\u00A0/g, ' ') : item.text }}
                        />
                    );
                }

                const values = (item.values || []).filter(Boolean);
                if (!item.title && !values.length) return null;

                if (!item.title) {
                    return (
                        <div key={item.id || index} className={`${valueStackClassName} md:col-span-2`}>
                            {values.map((value, valueIndex) => (
                                <div
                                    key={`${item.id || index}-value-${valueIndex}`}
                                    className={pairValueClassName}
                                    dangerouslySetInnerHTML={{ __html: typeof value === 'string' ? value.replace(/&nbsp;|\u00A0/g, ' ') : value }}
                                />
                            ))}
                        </div>
                    );
                }

                return (
                    <React.Fragment key={item.id || index}>
                        <span 
                            className={`${pairLabelClassName} md:mb-0 mb-0.5`}
                            dangerouslySetInnerHTML={{ __html: cleanHtmlInline(item.title) + ':' }}
                        />
                        <div className={`${valueStackClassName} md:mb-0 mb-3`}>
                            {values.map((value, valueIndex) => (
                                <div
                                    key={`${item.id || index}-value-${valueIndex}`}
                                    className={pairValueClassName}
                                    dangerouslySetInnerHTML={{ __html: typeof value === 'string' ? value.replace(/&nbsp;|\u00A0/g, ' ') : value }}
                                />
                            ))}
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default StructuredDetails;
