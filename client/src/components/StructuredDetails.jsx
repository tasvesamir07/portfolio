import React from 'react';
import { cleanHtmlInline } from '../utils/htmlRenderer';

const StructuredDetails = ({
    items = [],
    className = 'space-y-4',
    titleClassName = 'text-xl font-bold text-[#0b3b75] leading-tight',
    textClassName = 'text-gray-700 leading-8 text-base break-words [&_a]:text-sky-500 [&_a]:underline [&_a]:underline-offset-4',
    pairLabelClassName = 'text-gray-800 font-semibold',
    pairValueClassName = 'text-gray-700 leading-8 break-words [&_a]:text-sky-500 [&_a]:underline [&_a]:underline-offset-4',
    valueStackClassName = 'space-y-2',
    layoutClassName = 'flex flex-col md:flex-row md:items-start gap-x-4 gap-y-1.5'
}) => {
    if (!items.length) return null;

    return (
        <div className={className}>
            {items.map((item, index) => {
                if (item.type === 'title') {
                    return (
                        <h4 
                            key={item.id || index} 
                            className={titleClassName}
                            dangerouslySetInnerHTML={{ __html: cleanHtmlInline(item.title) }}
                        />
                    );
                }

                if (item.type === 'text') {
                    return (
                        <div
                            key={item.id || index}
                            className={textClassName}
                            dangerouslySetInnerHTML={{ __html: typeof item.text === 'string' ? item.text.replace(/&nbsp;|\u00A0/g, ' ') : item.text }}
                        />
                    );
                }

                const values = (item.values || []).filter(Boolean);
                if (!item.title && !values.length) return null;

                if (!item.title) {
                    return (
                        <div key={item.id || index} className={valueStackClassName}>
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
                    <div key={item.id || index} className={layoutClassName}>
                        <span 
                            className={`${pairLabelClassName} md:w-40 md:flex-shrink-0`}
                            dangerouslySetInnerHTML={{ __html: cleanHtmlInline(item.title) + ':' }}
                        />
                        <div className={valueStackClassName}>
                            {values.map((value, valueIndex) => (
                                <div
                                    key={`${item.id || index}-value-${valueIndex}`}
                                    className={pairValueClassName}
                                    dangerouslySetInnerHTML={{ __html: typeof value === 'string' ? value.replace(/&nbsp;|\u00A0/g, ' ') : value }}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default StructuredDetails;
