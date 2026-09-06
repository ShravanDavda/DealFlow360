import pool from "../config/db.js";

const getAllPriceLists = async () => {
    const result = await pool.query(`
        SELECT
            id,
            name,
            description,
            currency,
            is_default,
            is_active,
            created_at,
            updated_at
        FROM price_lists
        ORDER BY id DESC
    `);

    return result.rows;
};

const getPriceListById = async (id) => {
    const result = await pool.query(
        `
        SELECT
            id,
            name,
            description,
            currency,
            is_default,
            is_active,
            created_at,
            updated_at
        FROM price_lists
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
};

const createPriceList = async ({
    name,
    description,
    currency,
    isDefault
}) => {
    const existingPriceList = await pool.query(
        `
        SELECT id
        FROM price_lists
        WHERE LOWER(name) = LOWER($1)
        `,
        [name]
    );

    if (existingPriceList.rows.length > 0) {
        throw new Error(
            "Price list already exists"
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        if (isDefault === true) {
            await client.query(`
                UPDATE price_lists
                SET
                    is_default = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE is_default = TRUE
            `);
        }

        const result = await client.query(
            `
            INSERT INTO price_lists (
                name,
                description,
                currency,
                is_default
            )
            VALUES ($1, $2, $3, $4)
            RETURNING
                id,
                name,
                description,
                currency,
                is_default,
                is_active,
                created_at,
                updated_at
            `,
            [
                name,
                description || null,
                currency || "INR",
                isDefault || false
            ]
        );

        await client.query("COMMIT");

        return result.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const updatePriceList = async (
    id,
    {
        name,
        description,
        currency,
        isDefault,
        isActive
    }
) => {
    const existingPriceList =
        await getPriceListById(id);

    if (!existingPriceList) {
        throw new Error(
            "Price list not found"
        );
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const finalIsDefault =
            isDefault ??
            existingPriceList.is_default;

        if (finalIsDefault === true) {
            await client.query(
                `
                UPDATE price_lists
                SET
                    is_default = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id != $1
                AND is_default = TRUE
                `,
                [id]
            );
        }

        const result = await client.query(
            `
            UPDATE price_lists
            SET
                name = $1,
                description = $2,
                currency = $3,
                is_default = $4,
                is_active = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING
                id,
                name,
                description,
                currency,
                is_default,
                is_active,
                created_at,
                updated_at
            `,
            [
                name ??
                    existingPriceList.name,

                description ??
                    existingPriceList.description,

                currency ??
                    existingPriceList.currency,

                finalIsDefault,

                isActive ??
                    existingPriceList.is_active,

                id
            ]
        );

        await client.query("COMMIT");

        return result.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const deactivatePriceList = async (id) => {
    const existingPriceList =
        await getPriceListById(id);

    if (!existingPriceList) {
        throw new Error(
            "Price list not found"
        );
    }

    const result = await pool.query(
        `
        UPDATE price_lists
        SET
            is_active = FALSE,
            is_default = FALSE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
            id,
            name,
            is_active,
            is_default
        `,
        [id]
    );

    return result.rows[0];
};

const deletePriceList = async (id) => {
    const existingPriceList = await getPriceListById(id);

    if (!existingPriceList) {
        throw new Error("Price list not found");
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("DELETE FROM price_list_items WHERE price_list_id = $1", [id]);
        await client.query("UPDATE quotations SET price_list_id = NULL WHERE price_list_id = $1", [id]);
        const result = await client.query(
            "DELETE FROM price_lists WHERE id = $1 RETURNING id, name",
            [id]
        );
        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export {
    getAllPriceLists,
    getPriceListById,
    createPriceList,
    updatePriceList,
    deactivatePriceList,
    deletePriceList
};