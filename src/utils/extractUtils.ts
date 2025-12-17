export interface ExtractRecord {
    dt_movimento: string;
    ag_origem: string;
    lote: string;
    historico: string;
    documento: string;
    valor: string;
    cpf?: string;
    cnpj?: string;
    nome?: string;
    type?: 'C' | 'D';
}

export interface ExtractMetadata {
    options: string[];
    mappings: { [key: string]: string };
}

export const extractCpfCnpjNome = (historico: string): { cpf?: string; cnpj?: string; nome?: string } => {
    const withoutDateTime = historico
        .replace(/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(:\d{2})?\s+/, '')
        .replace(/^\d{2}\/\d{2}\s+\d{2}:\d{2}\s+/, '');

    const cpfCnpjMatch = withoutDateTime.match(/^(\d{11,14})\s+(.+)$/);

    if (cpfCnpjMatch) {
        const digits = cpfCnpjMatch[1];
        let cpf = '', cnpj = '';
        if (digits.length === 14 && digits.substring(8, 11) === '000') {
            cnpj = digits;
        } else {
            cpf = digits.length > 11 ? digits.substring(digits.length - 11) : digits;
        }
        return { cpf, cnpj, nome: cpfCnpjMatch[2].trim() };
    }

    const formattedNumberMatch = withoutDateTime.match(/^([\d.\/\-]+)\s+([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ].+)$/);

    if (formattedNumberMatch) {
        const rawDigits = formattedNumberMatch[1].replace(/\D/g, '');
        let cpf = '', cnpj = '';

        if (rawDigits.length === 14 && rawDigits.substring(8, 11) === '000') {
            cnpj = formattedNumberMatch[1];
        } else {
            if (rawDigits.length === 11 || (rawDigits.length === 14 && rawDigits.substring(8, 11) !== '000')) {
                if (rawDigits.length > 11) {
                    cpf = rawDigits.substring(rawDigits.length - 11);
                } else {
                    cpf = formattedNumberMatch[1];
                }
            }
        }

        if (cpf || cnpj) {
            return { cpf, cnpj, nome: formattedNumberMatch[2].trim() }
        }

        return { nome: formattedNumberMatch[2].trim() };
    }

    const trimmedText = withoutDateTime.trim();
    const looksLikeName = /^[A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ][A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝa-zàáâãäåçèéêëìíîïñòóôõöùúûüý]+(\s+[A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ][A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝa-zàáâãäåçèéêëìíîïñòóôõöùúûüý.]*)+$/.test(trimmedText);
    const isDescriptive = /^(tar\.|rende|tarifa|pagamento|transferencia|saldo|lancamento)/i.test(trimmedText);

    if (looksLikeName && !isDescriptive) {
        return { nome: trimmedText };
    }

    return {};
};

export const parseExtractRecords = (text: string): ExtractRecord[] => {
    const lines = text.split('\n');
    const records: ExtractRecord[] = [];

    let headerIndex = -1;
    let isMergedFormat = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('Dt. movimento')) {
            headerIndex = i;
            isMergedFormat = !line.includes('Dt. balancete');
            break;
        }
    }

    if (headerIndex === -1) return records;

    for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineLower = line.toLowerCase();

        if (lineLower.includes('lançamentos futuros') || lineLower.includes('lancamentos futuros')) break;
        if (lineLower.includes('saldo anterior') || lineLower.replace(/\s/g, '').includes('saldo')) continue;
        if (!line) continue;
        if (line.includes('===') || line.includes('---') || lineLower.includes('total')) continue;

        const parts = line.split(/\s{2,}/);

        // Check if this line starts with a date
        if (parts.length >= 4 && parts[0].match(/\d{2}\/\d{2}\/\d{4}/)) {
            if (isMergedFormat) {
                // Merged format: all data in one line
                // Format: dt_movimento  ag_origem  lote  historico  documento  valor [Type]
                const rawHistorico = parts[3]?.trim() || '';
                const { cpf, cnpj, nome } = extractCpfCnpjNome(rawHistorico);

                let valor = parts[5]?.trim() || '';
                let type: 'D' | 'C' = 'C';

                // Check for D/C suffix in value or separate part if space separated
                // First check parts[5] itself
                if (valor.toUpperCase().endsWith('D') || valor.startsWith('-')) {
                    type = 'D';
                } else if (parts[6]?.trim().toUpperCase() === 'D') {
                    // Check if next part is D (if split by space happened)
                    type = 'D';
                }

                // Always clean the value of the suffix
                valor = valor.replace(/\s*[DC]$/i, '').trim();

                records.push({
                    dt_movimento: parts[0]?.trim() || '',
                    ag_origem: parts[1]?.trim() || '',
                    lote: parts[2]?.trim() || '',
                    historico: rawHistorico,
                    documento: parts[4]?.trim() || '',
                    valor,
                    type,
                    cpf,
                    cnpj,
                    nome,
                });
            } else {
                // Original format parsing
                let historico = '';
                let nextLineIndex = i + 1;
                while (nextLineIndex < lines.length) {
                    const nextLine = lines[nextLineIndex].trim();
                    if (nextLine && !nextLine.includes('===') && !nextLine.includes('---')) {
                        historico = nextLine;
                        break;
                    }
                    nextLineIndex++;
                }

                let valor = '';
                let type: 'D' | 'C' = 'C';
                const moneyMatches = line.match(/-?\d{1,3}(?:\.\d{3})*,\d{2}(?:\s*[DC])?/gi);
                if (moneyMatches && moneyMatches.length > 0) {
                    const lastMatch = moneyMatches[moneyMatches.length - 1];
                    valor = lastMatch;

                    if (lastMatch.toUpperCase().endsWith('D') || lastMatch.startsWith('-')) {
                        type = 'D';
                    }
                    valor = valor.replace(/\s*[DC]$/i, '').trim();
                } else {
                    valor = parts[5]?.trim() || '';
                    type = valor.toUpperCase().endsWith('D') || valor.startsWith('-') ? 'D' : 'C';
                    valor = valor.replace(/\s*[DC]$/i, '').trim();
                }

                const { cpf, cnpj, nome } = extractCpfCnpjNome(historico);

                records.push({
                    dt_movimento: parts[0]?.trim() || '',
                    ag_origem: parts[2]?.trim() || '',
                    lote: parts[3]?.trim() || '',
                    documento: parts[4]?.trim() || '',
                    valor,
                    type,
                    historico: historico,
                    cpf,
                    cnpj,
                    nome,
                });

                i = nextLineIndex;
            }
        }
    }

    return records;
};

export const parseBrValue = (value: string): number => {
    if (!value) return 0;
    const val = parseFloat(value.replace(/\./g, '').replace(',', '.'));
    return isNaN(val) ? 0 : val;
};
