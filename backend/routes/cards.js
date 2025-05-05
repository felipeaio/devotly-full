import express from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import QRCode from 'qrcode';

const router = express.Router();

// Configuração do Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Classe de erro personalizado
class APIError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Schema de validação para criação de cartões
const cardSchema = z.object({
    email: z.string().email({ message: 'E-mail inválido' }),
    conteudo: z.object({
        pageName: z
            .string()
            .min(3, { message: 'Nome da página deve ter pelo menos 3 caracteres' })
            .max(30, { message: 'Nome da página deve ter no máximo 30 caracteres' }),
        title: z
            .string()
            .min(3, { message: 'Título deve ter pelo menos 3 caracteres' })
            .max(50, { message: 'Título deve ter no máximo 50 caracteres' }),
        message: z
            .string()
            .min(10, { message: 'Mensagem deve ter pelo menos 10 caracteres' })
            .max(5000, { message: 'Mensagem deve ter no máximo 5000 caracteres' }),
        verse: z.object({
            text: z.string().min(1, { message: 'Texto do versículo é obrigatório' }),
            reference: z.string().min(1, { message: 'Referência do versículo é obrigatória' })
        }).optional(),
        images: z
            .array(z.string().url({ message: 'URL de imagem inválida' }))
            .max(7, { message: 'Máximo de 7 imagens permitidas' })
            .optional(),
        mediaUrl: z.string().url({ message: 'URL de mídia inválida' }).optional(),
        mediaType: z.enum(['audio', 'video'], { message: 'Tipo de mídia inválido' }).optional(),
        finalMessage: z.string().max(5000, { message: 'Mensagem final deve ter no máximo 5000 caracteres' }).optional(),
        theme: z.enum(['starry', 'light', 'nature'], { message: 'Tema inválido' }).optional()
    })
});

// Schema de validação para atualização de cartões
const updateCardSchema = z.object({
    conteudo: z.object({
        pageName: z
            .string()
            .min(3, { message: 'Nome da página deve ter pelo menos 3 caracteres' })
            .max(30, { message: 'Nome da página deve ter no máximo 30 caracteres' })
            .optional(),
        title: z
            .string()
            .min(3, { message: 'Título deve ter pelo menos 3 caracteres' })
            .max(50, { message: 'Título deve ter no máximo 50 caracteres' })
            .optional(),
        message: z
            .string()
            .min(10, { message: 'Mensagem deve ter pelo menos 10 caracteres' })
            .max(5000, { message: 'Mensagem deve ter no máximo 5000 caracteres' })
            .optional(),
        verse: z.object({
            text: z.string().min(1, { message: 'Texto do versículo é obrigatório' }),
            reference: z.string().min(1, { message: 'Referência do versículo é obrigatória' })
        }).optional(),
        images: z
            .array(z.string().url({ message: 'URL de imagem inválida' }))
            .max(7, { message: 'Máximo de 7 imagens permitidas' })
            .optional(),
        mediaUrl: z.string().url({ message: 'URL de mídia inválida' }).optional().nullable(),
        mediaType: z.enum(['audio', 'video'], { message: 'Tipo de mídia inválido' }).optional().nullable(),
        finalMessage: z.string().max(5000, { message: 'Mensagem final deve ter no máximo 5000 caracteres' }).optional().nullable(),
        theme: z.enum(['starry', 'light', 'nature'], { message: 'Tema inválido' }).optional()
    }).strict()
});

// Função para gerar QR code
async function generateQRCode(url) {
    try {
        console.log(`[${new Date().toISOString()}] Gerando QR code para URL: ${url}`);
        const qrCodeBuffer = await QRCode.toBuffer(url, {
            type: 'png',
            margin: 1,
            width: 200,
        });
        return qrCodeBuffer;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Erro ao gerar QR code:`, error.message);
        throw new APIError(`Falha ao gerar QR code: ${error.message}`);
    }
}

// Função para fazer upload do QR code
async function uploadQRCodeToBucket(qrCodeBuffer, cardId) {
    try {
        console.log(`[${new Date().toISOString()}] Fazendo upload do QR code: qr_code_${cardId}.png`);
        const { error } = await supabase.storage
            .from('qrcodes')
            .upload(`qr_code_${cardId}.png`, qrCodeBuffer, {
                contentType: 'image/png',
                upsert: true,
            });
        if (error) throw new APIError(`Falha ao fazer upload do QR code: ${error.message}`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Erro no upload:`, error.message);
        throw error;
    }
}

// Rota POST: Criar um novo cartão
router.post('/', async (req, res, next) => {
    try {
        if (!req.is('application/json')) {
            throw new APIError('Content-Type deve ser application/json', 415);
        }
        if (req.headers['content-length'] && parseInt(req.headers['content-length']) > 10 * 1024 * 1024) {
            throw new APIError('Payload muito grande', 413);
        }

        const validatedData = cardSchema.parse(req.body);
        if (validatedData.email !== req.user.email) {
            throw new APIError('E-mail fornecido não corresponde ao usuário autenticado', 403);
        }

        const id = uuidv4();
        const token_edit = uuidv4();
        const sanitizedPageName = validatedData.conteudo.pageName
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        const url = `devotly.com/c/${id}-${sanitizedPageName}`;

        const qrCodeBuffer = await generateQRCode(url);
        await uploadQRCodeToBucket(qrCodeBuffer, id);

        const { data, error } = await supabase
            .from('cards')
            .insert({
                id,
                email: validatedData.email,
                url,
                conteudo: validatedData.conteudo,
                token_edit,
            })
            .select();

        if (error) {
            throw new APIError(`Falha ao criar cartão: ${error.message}`, 500);
        }

        res.status(201).json({
            success: true,
            data: { id, url, token_edit, ...data[0] },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            const formattedErrors = error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            return res.status(400).json({
                success: false,
                errors: formattedErrors,
                message: 'Erro de validação',
            });
        }
        next(error);
    }
});

// Rota GET: Recuperar cartões por e-mail
router.get('/:email', async (req, res, next) => {
    try {
        const email = z.string().email({ message: 'E-mail inválido' }).parse(req.params.email);
        if (email !== req.user.email) {
            throw new APIError('Acesso negado: você só pode recuperar seus próprios cartões', 403);
        }

        const { data, error } = await supabase
            .from('cards')
            .select('id, url, conteudo, token_edit')
            .eq('email', email);

        if (error) {
            throw new APIError(`Falha ao recuperar cartões: ${error.message}`, 500);
        }

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: error.errors[0].message,
            });
        }
        next(error);
    }
});

// Rota GET: Recuperar um cartão por ID
router.get('/id/:id', async (req, res, next) => {
    try {
        const id = z.string().uuid({ message: 'ID inválido' }).parse(req.params.id);
        const { data, error } = await supabase
            .from('cards')
            .select('id, url, conteudo, token_edit')
            .eq('id', id)
            .single();

        if (error || !data) {
            throw new APIError('Cartão não encontrado', 404);
        }

        res.json({
            success: true,
            data,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: error.errors[0].message,
            });
        }
        next(error);
    }
});

// Rota PATCH: Atualizar um cartão
router.patch('/:id', async (req, res, next) => {
    try {
        const id = z.string().uuid({ message: 'ID inválido' }).parse(req.params.id);
        const token_edit = z.string({ required_error: 'Token de edição é obrigatório' }).parse(
            req.headers['x-token-edit']
        );
        const validatedData = updateCardSchema.parse(req.body);

        const { data: card, error: checkError } = await supabase
            .from('cards')
            .select('id, conteudo, url')
            .eq('id', id)
            .eq('token_edit', token_edit)
            .single();

        if (checkError || !card) {
            throw new APIError('Cartão não encontrado ou token inválido', 403);
        }

        const updatedConteudo = {
            ...card.conteudo,
            ...validatedData.conteudo,
            images: validatedData.conteudo.images || card.conteudo.images
        };

        let updatedUrl = card.url;
        if (validatedData.conteudo.pageName) {
            const sanitizedPageName = validatedData.conteudo.pageName
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
            updatedUrl = `devotly.com/c/${id}-${sanitizedPageName}`;
            const qrCodeBuffer = await generateQRCode(updatedUrl);
            await uploadQRCodeToBucket(qrCodeBuffer, id);
        }

        const { data: updatedCard, error: updateError } = await supabase
            .from('cards')
            .update({
                conteudo: updatedConteudo,
                url: updatedUrl,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            throw new APIError(`Falha ao atualizar cartão: ${updateError.message}`, 500);
        }

        res.json({
            success: true,
            message: 'Cartão atualizado com sucesso',
            data: updatedCard,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            const formattedErrors = error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
            }));
            return res.status(400).json({
                success: false,
                errors: formattedErrors,
                message: 'Erro de validação',
            });
        }
        next(error);
    }
});

// Rota GET: Buscar versículo via API.Bible
router.get('/verse/:book/:chapter/:verse', async (req, res, next) => {
    try {
        const { book, chapter, verse } = z.object({
            book: z.string().min(1),
            chapter: z.string().min(1),
            verse: z.string().min(1)
        }).parse(req.params);
        const reference = `${book}.${chapter}.${verse}`;

        // Verificar cache
        const { data: cachedVerse } = await supabase
            .from('verses')
            .select('text, reference')
            .eq('reference', reference)
            .single();

        if (cachedVerse) {
            return res.json({
                success: true,
                data: cachedVerse
            });
        }

        // Buscar na API.Bible
        const response = await axios.get(
            `https://api.scripture.api.bible/v1/bibles/de4e12af7f28f599-01/passages/${reference}`,
            { headers: { 'api-key': process.env.BIBLE_API_KEY } }
        );

        // Armazenar no cache
        await supabase.from('verses').insert({
            reference,
            text: response.data.content,
            bible_version: 'ARA'
        });

        res.json({
            success: true,
            data: {
                text: response.data.content,
                reference: response.data.reference
            }
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Erro ao buscar versículo:`, error.message);
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: error.errors[0].message
            });
        }
        res.status(500).json({
            success: false,
            message: 'Falha ao buscar versículo'
        });
    }
});

export default router;