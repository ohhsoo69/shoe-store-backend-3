/**
 * order controller
 */

"use strict";
import { Context } from "koa";
import stripe from "stripe";

const stripeInstance = new stripe(process.env.STRIPE_KEY);

/**
 * order controller
 */
import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::order.order",
  ({ strapi }) => ({
    async create(ctx: Context) {
      const { products } = ctx.request.body;
      try {
        const lineItems = await Promise.all(
          products.map(async (product: any) => {
            const item: any = await strapi
              .service("api::product.product")
              .findOne(product.id);

            console.log("this is item------->", item);
            console.log("this is product------->", product);

            return {
              price_data: {
                currency: "inr",
                product_data: {
                  name: item.name,
                },
                unit_amount: Math.round(item.price * 100),
              },
              quantity: product.quantity,
            };
          })
        );

        const session = await stripeInstance.checkout.sessions.create({
          shipping_address_collection: { allowed_countries: ["IN"] },
          payment_method_types: ["card"],
          mode: "payment",
          success_url: process.env.CLIENT_URL + `/success`,
          cancel_url: process.env.CLIENT_URL + "/failed",
          line_items: lineItems,
        });

        await strapi
          .service("api::order.order")
          .create({ data: { products, stripeId: session.id } });

        return { stripeSession: session };
      } catch (error: any) {
        ctx.response.status = 500;
        return { error };
      }
    },
  })
);
